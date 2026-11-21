import { Router } from 'express';
import crypto from 'crypto';
import { execSync } from 'child_process';
import fs from 'fs';
import multer from 'multer';
import { db } from '../database/db.js';
import { ENV } from '../config/env.js';
import { requireUser } from '../middlewares/authTma.js';
import { uploadMem, processAndSaveImage } from '../middlewares/upload.js';
import { broadcastToTelegram, getCatalog, escHtml } from '../services/syncEngine.js';

export const adminRouter = Router();
const uploadRestore = multer({ dest: '/tmp' });

db.exec(`
  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id TEXT NOT NULL,
    action TEXT NOT NULL,
    detail TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

function isAdminUser(user) {
  if (!user) return false;
  const ownerIds = (ENV.OWNER_IDS || []).map(String);
  if (ownerIds.includes(String(user.id))) return true;
  return user.role === 'owner' || user.role === 'admin' || user.role === 'moderator';
}

function isOwnerOnly(req) {
  const uid = String(req.tgUser?.id || req.dbUser?.id || req.query.ownerId || '');
  const ownerIds = (ENV.OWNER_IDS || []).map(String);
  return Boolean(uid && ownerIds.includes(uid));
}

function logAudit(actorId, action, detail) {
  try {
    db.prepare('INSERT INTO audit_logs (actor_id, action, detail, created_at) VALUES (?, ?, ?, ?)')
      .run(String(actorId), action, detail, Date.now());
  } catch (e) {}
}

// GET /api/admin/overview -> Data lengkap Ruang Dalang
adminRouter.get('/admin/overview', requireUser, (req, res) => {
  if (!isAdminUser(req.dbUser)) {
    return res.status(403).json({ error: 'Khusus pengurus Ruang Dalang.' });
  }

  let pendingMenfess = [];
  try {
    pendingMenfess = db.prepare("SELECT * FROM menfess WHERE status = 'pending' ORDER BY created_at ASC LIMIT 30").all();
  } catch (e) {}

  const users = db.prepare(
    'SELECT id, name, username, role, psc, cred, photo_url AS photoUrl FROM users ORDER BY psc DESC LIMIT 100'
  ).all();

  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 20').all();

  res.json({ pendingMenfess, users, logs });
});

// POST /api/admin/items -> Tambah item ke Lapak Rongsok (tabel items)
adminRouter.post('/admin/items', requireUser, uploadMem.single('asset'), async (req, res) => {
  if (!isAdminUser(req.dbUser)) return res.status(403).json({ error: 'Akses ditolak.' });

  try {
    const type = String(req.body?.type || 'gift').trim();
    const name = String(req.body?.name || '').trim().slice(0, 32);
    const price = Math.max(1, Number(req.body?.price) || 50);
    const rarity = String(req.body?.rarity || 'Rare').trim();
    const stock = req.body?.stock !== undefined && req.body?.stock !== '' ? Number(req.body.stock) : -1;
    const desc = String(req.body?.desc || '').trim().slice(0, 100);

    if (name.length < 2) return res.status(400).json({ error: 'Nama item wajib diisi.' });

    let imageUrl = '';
    if (req.file) {
      imageUrl = await processAndSaveImage(req.file, 'shop', { width: 512, height: 512, fit: 'inside' });
    }

    const id = 'itm_' + crypto.randomBytes(4).toString('hex');
    db.prepare(`
      INSERT INTO items (id, type, name, price, rarity, stock, desc, image_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, type, name, price, rarity, stock, desc, imageUrl, Date.now());

    logAudit(req.dbUser.id, 'TAMBAH ITEM', `${name} (${price} PSC)`);

    await broadcastToTelegram({
      target: 'both',
      text: `<b>ITEM BARU DI LAPAK RONGSOK</b>\n<b>${escHtml(name)}</b> (${escHtml(rarity)})\nHarga: <b>${price} PSC</b>\n<i>${escHtml(desc)}</i>`,
      buttonText: 'CEK LAPAK',
      startParam: 'lapak',
      feedText: `Item baru "${name}" rilis di Lapak Rongsok!`
    });

    res.json({ ok: true, catalog: getCatalog() });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Gagal menambah item.' });
  }
});

// DELETE /api/admin/items/:id -> Hapus item dari tabel items
adminRouter.delete('/admin/items/:id', requireUser, (req, res) => {
  if (!isAdminUser(req.dbUser)) return res.status(403).json({ error: 'Akses ditolak.' });
  db.prepare('DELETE FROM items WHERE id = ?').run(String(req.params.id));
  res.json({ ok: true, catalog: getCatalog() });
});

// POST /api/admin/broadcast -> Pengumuman resmi ke Grup & Channel
adminRouter.post('/admin/broadcast', requireUser, async (req, res) => {
  if (!isAdminUser(req.dbUser)) return res.status(403).json({ error: 'Akses ditolak.' });

  const target = String(req.body?.target || 'both');
  const text = String(req.body?.text || '').trim();
  if (text.length < 3) return res.status(400).json({ error: 'Teks pengumuman terlalu pendek.' });

  await broadcastToTelegram({
    target,
    text: `<b>PENGUMUMAN MARKAS</b>\n\n${escHtml(text)}`,
    buttonText: 'BUKA PUNKSHIT.OS',
    startParam: 'markas',
    feedText: text.slice(0, 100)
  });

  logAudit(req.dbUser.id, 'BROADCAST', `Target: ${target} - ${text.slice(0, 40)}`);
  res.json({ ok: true });
});

// POST /api/admin/events -> Buat Event baru & umumkan ke Grup/Channel
adminRouter.post('/admin/events', requireUser, async (req, res) => {
  if (!isAdminUser(req.dbUser)) return res.status(403).json({ error: 'Akses ditolak.' });

  const title = String(req.body?.title || '').trim();
  const dateText = String(req.body?.dateText || '').trim();
  const rewardText = String(req.body?.rewardText || 'PSC & Street Cred').trim();
  if (!title || !dateText) return res.status(400).json({ error: 'Judul dan waktu event wajib diisi.' });

  const id = 'ev_' + crypto.randomBytes(4).toString('hex');
  db.prepare(`
    INSERT INTO events (id, type, title, date_text, description, reward_text, created_at)
    VALUES (?, 'EVENT', ?, ?, '', ?, ?)
  `).run(id, title, dateText, rewardText, Date.now());

  await broadcastToTelegram({
    target: 'both',
    text: `<b>EVENT BARU: ${escHtml(title.toUpperCase())}</b>\nWaktu: <b>${escHtml(dateText)}</b>\nHadiah: <b>${escHtml(rewardText)}</b>`,
    buttonText: 'IKUT RUSUH (RSVP)',
    startParam: 'event',
    feedText: `Event baru: ${title} (${dateText}).`
  });

  const events = db.prepare('SELECT * FROM events ORDER BY created_at DESC LIMIT 15').all().map((e) => ({
    id: e.id,
    type: e.type,
    title: e.title,
    dateText: e.date_text,
    description: e.description,
    rewardText: e.reward_text,
    rsvpCount: 0,
    joined: false
  }));

  res.json({ ok: true, events });
});

// POST /api/admin/polls -> Buka Sidang Warga & umumkan ke Grup
adminRouter.post('/admin/polls', requireUser, async (req, res) => {
  if (!isAdminUser(req.dbUser)) return res.status(403).json({ error: 'Akses ditolak.' });

  const question = String(req.body?.question || '').trim();
  const options = Array.isArray(req.body?.options) ? req.body.options : [];
  if (!question || options.length < 2) return res.status(400).json({ error: 'Minimal 2 pilihan sidang.' });

  const id = 'pl_' + crypto.randomBytes(4).toString('hex');
  const optsJson = JSON.stringify(options.map((label) => ({ label: String(label), votes: 0 })));

  db.prepare('INSERT INTO polls (id, question, options_json, created_at) VALUES (?, ?, ?, ?)')
    .run(id, question, optsJson, Date.now());

  await broadcastToTelegram({
    target: 'group',
    text: `<b>SIDANG WARGA DIBUKA</b>\n\n<b>${escHtml(question)}</b>\n\nMasuk ke Mini App buat kasih suara lo!`,
    buttonText: 'IKUT VOTING SIDANG',
    startParam: 'sidang',
    feedText: `Sidang warga baru: ${question}`
  });

  const polls = db.prepare('SELECT * FROM polls ORDER BY created_at DESC LIMIT 10').all().map((p) => {
    const o = JSON.parse(p.options_json || '[]');
    return { id: p.id, question: p.question, options: o, totalVotes: o.reduce((a, b) => a + (b.votes || 0), 0) };
  });

  res.json({ ok: true, polls });
});

// POST /api/admin/menfess/review -> Setujui / Tolak Kotak Rahasia
adminRouter.post('/admin/menfess/review', requireUser, async (req, res) => {
  if (!isAdminUser(req.dbUser)) return res.status(403).json({ error: 'Akses ditolak.' });

  const id = String(req.body?.id || '');
  const decision = String(req.body?.decision || 'reject');
  const mf = db.prepare('SELECT * FROM menfess WHERE id = ?').get(id);
  if (!mf) return res.status(404).json({ error: 'Menfess tidak ditemukan.' });

  const status = decision === 'approve' ? 'approved' : 'rejected';
  db.prepare('UPDATE menfess SET status = ? WHERE id = ?').run(status, id);

  if (status === 'approved') {
    await broadcastToTelegram({
      target: 'both',
      text: `<b>KOTAK RAHASIA (${escHtml(mf.category.toUpperCase())})</b>\n\n<i>"${escHtml(mf.text)}"</i>`,
      buttonText: 'KIRIM MENFESS',
      startParam: 'kotak',
      feedText: `Menfess baru di kategori ${mf.category}.`
    });
  }

  const pendingMenfess = db.prepare("SELECT * FROM menfess WHERE status = 'pending' ORDER BY created_at ASC LIMIT 30").all();
  res.json({ ok: true, pendingMenfess });
});

// POST /api/admin/economy/adjust -> Suntik / Tarik PSC warga
adminRouter.post('/admin/economy/adjust', requireUser, (req, res) => {
  if (!isAdminUser(req.dbUser)) return res.status(403).json({ error: 'Akses ditolak.' });

  const rawTarget = String(req.body?.target || '').trim().replace(/^@/, '');
  const amount = Number(req.body?.amount);
  const reason = String(req.body?.reason || 'Penyesuaian Admin').trim();

  if (!rawTarget || !amount || Number.isNaN(amount)) {
    return res.status(400).json({ error: 'Target warga dan nominal PSC wajib valid.' });
  }

  const targetUser = db.prepare('SELECT * FROM users WHERE id = ? OR LOWER(username) = LOWER(?)').get(rawTarget, rawTarget);
  if (!targetUser) return res.status(404).json({ error: 'Warga kaga ketemu di database.' });

  db.prepare('UPDATE users SET psc = MAX(0, psc + ?) WHERE id = ?').run(amount, targetUser.id);
  logAudit(req.dbUser.id, 'EKONOMI PSC', `${amount > 0 ? '+' : ''}${amount} PSC ke ${targetUser.name} (${reason})`);

  res.json({ ok: true });
});

// POST /api/admin/roles -> Atur jabatan pengurus
adminRouter.post('/admin/roles', requireUser, (req, res) => {
  if (!isAdminUser(req.dbUser)) return res.status(403).json({ error: 'Akses ditolak.' });

  const rawTarget = String(req.body?.target || '').trim().replace(/^@/, '');
  const role = String(req.body?.role || 'member').trim().toLowerCase();
  if (!['member', 'moderator', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Role tidak valid.' });
  }

  const targetUser = db.prepare('SELECT * FROM users WHERE id = ? OR LOWER(username) = LOWER(?)').get(rawTarget, rawTarget);
  if (!targetUser) return res.status(404).json({ error: 'Warga kaga ketemu.' });

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, targetUser.id);
  logAudit(req.dbUser.id, 'SET ROLE', `${targetUser.name} -> ${role}`);

  res.json({ ok: true });
});

// ============================================================
// MIGRASI SERVER: 1-KLIK BACKUP & RESTORE (KHUSUS OWNER_IDS)
// ============================================================

// GET /api/admin/backup?ownerId=123456789 -> Unduh arsip .tar.gz berisi Database + Uploads
adminRouter.get('/admin/backup', (req, res) => {
  if (!isOwnerOnly(req)) {
    return res.status(403).json({ error: 'Akses ditolak. Khusus Owner Markas!' });
  }

  try {
    // Pastikan WAL SQLite di-flush ke file utama sebelum dibungkus
    try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch (_) {}

    const tmpFile = `/tmp/punkshit_backup_${Date.now()}.tar.gz`;
    execSync(`tar -czf "${tmpFile}" -C "${ENV.DATA_DIR}" .`);

    const filename = `punkshit_backup_${new Date().toISOString().slice(0, 10)}.tar.gz`;
    res.download(tmpFile, filename, () => {
      try { fs.unlinkSync(tmpFile); } catch (_) {}
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal membuat arsip backup: ' + err.message });
  }
});

// GET /api/admin/restore-ui?ownerId=123456789 -> Halaman upload browser tanpa perlu terminal/curl
adminRouter.get('/admin/restore-ui', (req, res) => {
  if (!isOwnerOnly(req)) {
    return res.status(403).send('Akses ditolak. Khusus Owner Markas!');
  }

  const ownerId = escHtml(String(req.query.ownerId || ''));
  res.send(`<!doctype html>
  <html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Restore Database PUNKSHIT.OS</title>
  <style>
    body{font-family:system-ui,sans-serif;background:#0b0f19;color:#f8fafc;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px}
    .box{background:#111827;border:1px solid #334155;border-radius:16px;padding:24px;max-width:400px;width:100%}
    h2{margin:0 0 8px;font-size:18px;color:#38bdf8}
    p{font-size:13px;color:#94a3b8;line-height:1.5;margin:0 0 16px}
    input[type=file]{width:100%;margin-bottom:14px;color:#cbd5e1}
    button{width:100%;padding:12px;border:none;border-radius:10px;background:#2563eb;color:#fff;font-weight:700;font-size:14px;cursor:pointer}
    #msg{margin-top:12px;font-size:13px;color:#facc15}
  </style></head><body>
  <div class="box">
    <h2>Restore Data PUNKSHIT.OS</h2>
    <p>Pilih file <b>punkshit_backup_YYYY-MM-DD.tar.gz</b> dari server lama. Server akan otomatis restart setelah selesai.</p>
    <input type="file" id="f" accept=".gz,.tar.gz,application/gzip">
    <button onclick="go()">UPLOAD & RESTORE SEKARANG</button>
    <div id="msg"></div>
  </div>
  <script>
    async function go(){
      const file = document.getElementById('f').files[0];
      const msg = document.getElementById('msg');
      if(!file){ msg.textContent = 'Pilih file .tar.gz dulu!'; return; }
      msg.textContent = 'Mengupload & mengekstrak data...';
      const fd = new FormData();
      fd.append('backup', file);
      try {
        const r = await fetch('/api/admin/restore?ownerId=${ownerId}', { method: 'POST', body: fd });
        const d = await r.json();
        msg.textContent = d.message || d.error || 'Selesai!';
      } catch(e){ msg.textContent = 'Error: ' + e.message; }
    }
  </script></body></html>`);
});

// POST /api/admin/restore?ownerId=123456789 -> Ekstrak backup ke DATA_DIR & restart otomatis
adminRouter.post('/admin/restore', uploadRestore.single('backup'), (req, res) => {
  if (!isOwnerOnly(req)) {
    return res.status(403).json({ error: 'Akses ditolak. Khusus Owner Markas!' });
  }

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File backup (.tar.gz) belum dipilih.' });
    }

    execSync(`tar -xzf "${req.file.path}" -C "${ENV.DATA_DIR}"`);
    try { fs.unlinkSync(req.file.path); } catch (_) {}

    res.json({
      ok: true,
      message: 'Restore berhasil! Server restart otomatis dalam 2 detik...'
    });

    setTimeout(() => process.exit(0), 2000);
  } catch (err) {
    res.status(500).json({ error: 'Gagal restore: ' + err.message });
  }
});
