import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../database/db.js';
import { ENV } from '../config/env.js';
import { requireUser } from '../middlewares/authTma.js';
import { uploadMem, processAndSaveImage } from '../middlewares/upload.js';
import { broadcastToTelegram, getCatalog, escHtml } from '../services/syncEngine.js';

export const adminRouter = Router();

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
