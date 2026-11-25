import { Router } from 'express';
import crypto from 'crypto';
import { execSync } from 'child_process';
import fs from 'fs';
import multer from 'multer';
import { db } from '../database/db.js';
import { ENV } from '../config/env.js';
import { requireUser } from '../middlewares/authTma.js';
import { uploadMem, processAndSaveImage } from '../middlewares/upload.js';
import { broadcastToTelegram, getCatalog, escHtml, notifyPrivateUser } from '../services/syncEngine.js';

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
  CREATE TABLE IF NOT EXISTS psc_requests (
    id TEXT PRIMARY KEY,
    requester_id TEXT NOT NULL,
    requester_name TEXT NOT NULL,
    target_id TEXT NOT NULL,
    target_name TEXT NOT NULL,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL
  );
`);

try { db.exec('ALTER TABLE users ADD COLUMN is_frozen INTEGER DEFAULT 0'); } catch (_) {}
try { db.exec('ALTER TABLE items ADD COLUMN is_archived INTEGER DEFAULT 0'); } catch (_) {}
try { db.exec('ALTER TABLE items ADD COLUMN is_limited INTEGER DEFAULT 0'); } catch (_) {}
try { db.exec("ALTER TABLE inventory ADD COLUMN item_snapshot TEXT DEFAULT ''"); } catch (_) {}

function isOwnerUser(user) {
  if (!user) return false;
  const ownerIds = (ENV.OWNER_IDS || []).map(String);
  return ownerIds.includes(String(user.id)) || user.role === 'owner';
}

function isAdminUser(user) {
  if (!user) return false;
  if (isOwnerUser(user)) return true;
  return user.role === 'admin' || user.role === 'moderator';
}

function isOwnerOnly(req) {
  if (req.dbUser && isOwnerUser(req.dbUser)) return true;
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

  let pendingCollabs = [];
  try {
    pendingCollabs = db.prepare("SELECT * FROM item_submissions WHERE status = 'pending' ORDER BY created_at ASC LIMIT 20").all();
  } catch (e) {}

  let pscRequests = [];
  try {
    pscRequests = db.prepare("SELECT * FROM psc_requests WHERE status = 'pending' ORDER BY created_at ASC LIMIT 30").all();
  } catch (e) {}

  const users = db.prepare(
    'SELECT id, name, username, role, psc, cred, COALESCE(is_frozen, 0) AS isFrozen, photo_url AS photoUrl FROM users ORDER BY cred DESC LIMIT 100'
  ).all();

  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 20').all();

  res.json({ pendingMenfess, pendingCollabs, pscRequests, users, logs });
});

// POST /api/admin/users/freeze -> Bekukan / Pulihkan akun warga bermasalah
adminRouter.post('/admin/users/freeze', requireUser, (req, res) => {
  if (!isAdminUser(req.dbUser)) return res.status(403).json({ error: 'Akses ditolak.' });

  const rawTarget = String(req.body?.target || '').trim().replace(/^@/, '');
  const mode = String(req.body?.mode || 'freeze');
  const reason = String(req.body?.reason || 'Penertiban Markas').trim();
  if (!rawTarget) return res.status(400).json({ error: 'Target warga wajib diisi.' });

  const targetUser = db.prepare('SELECT * FROM users WHERE id = ? OR LOWER(username) = LOWER(?)').get(rawTarget, rawTarget);
  if (!targetUser) return res.status(404).json({ error: 'Warga tidak ditemukan di database.' });
  if (isOwnerUser(targetUser)) return res.status(403).json({ error: 'Akun Owner tidak dapat dibekukan.' });

  const flag = mode === 'freeze' ? 1 : 0;
  db.prepare('UPDATE users SET is_frozen = ? WHERE id = ?').run(flag, targetUser.id);
  logAudit(req.dbUser.id, flag ? 'FREEZE WARGA' : 'UNFREEZE WARGA', `${targetUser.name} (${reason})`);

  res.json({ ok: true });
});

// POST /api/admin/collab/review -> Kurasi Item Collab Warga (tabel item_submissions + royalti 20%)
adminRouter.post('/admin/collab/review', requireUser, async (req, res) => {
  if (!isAdminUser(req.dbUser)) return res.status(403).json({ error: 'Akses ditolak.' });

  const id = String(req.body?.id || '');
  const decision = String(req.body?.decision || 'reject');
  const sub = db.prepare('SELECT * FROM item_submissions WHERE id = ?').get(id);
  if (!sub || sub.status !== 'pending') {
    return res.status(404).json({ error: 'Pengajuan collab tidak ditemukan atau sudah diproses.' });
  }

  if (decision === 'approve') {
    const itemId = 'collab-' + crypto.randomBytes(3).toString('hex');
    const finalPrice = Number(sub.price) || 100;
    const creatorLabel = sub.creator_username ? `@${sub.creator_username}` : sub.creator_name;
    const fullDesc = `${sub.desc || 'Item spesial kolaborasi warga.'} (Collab by ${creatorLabel})`;

    db.transaction(() => {
      db.prepare(`
        INSERT INTO items (id, type, name, price, rarity, stock, desc, image_url, creator_id, creator_name, is_collab, created_at)
        VALUES (?, ?, ?, ?, 'Collab', -1, ?, ?, ?, ?, 1, ?)
      `).run(itemId, sub.type, sub.name, finalPrice, fullDesc, sub.image_url || '', sub.creator_id, creatorLabel, Date.now());

      db.prepare("UPDATE item_submissions SET status = 'approved', reviewed_by = ? WHERE id = ?").run(String(req.dbUser.id), id);
      db.prepare('INSERT INTO inventory (user_id, item_id, acquired_at) VALUES (?, ?, ?)').run(sub.creator_id, itemId, Date.now());
    })();

    logAudit(req.dbUser.id, 'ACC COLLAB', `Setujui ${sub.name} (${itemId}) oleh ${creatorLabel}`);

    await notifyPrivateUser(
      sub.creator_id,
      `🎉 <b>ITEM COLLAB KAMU DI-ACC!</b>\n\nKarya <b>${escHtml(sub.name)}</b> resmi rilis di <b>Lapak Rongsok</b> seharga <b>${finalPrice} PSC</b>!\n` +
      `• Kamu otomatis dapat 1 item gratis di gudang.\n` +
      `• Tiap kali warga lain beli, kamu dapat <b>royalti 20% PSC</b> otomatis!`,
      { buttonText: '🛍️ CEK LAPAK RONGSOK', startParam: 'lapak' }
    ).catch(() => {});
  } else {
    db.prepare("UPDATE item_submissions SET status = 'rejected', reviewed_by = ? WHERE id = ?").run(String(req.dbUser.id), id);
    logAudit(req.dbUser.id, 'TOLAK COLLAB', `${sub.name} oleh ${sub.creator_name}`);

    await notifyPrivateUser(
      sub.creator_id,
      `❌ <b>PENGAJUAN COLLAB DITOLAK</b>\nItem: <b>${escHtml(sub.name)}</b>\nAlasan: <i>Belum sesuai kriteria tema markas.</i>`
    ).catch(() => {});
  }

  res.json({ ok: true, catalog: getCatalog() });
});

// POST /api/admin/items -> Tambah item resmi ke Lapak Rongsok (tabel items)
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

// DELETE /api/admin/items/:id -> Mode default: Arsipkan jadi Limited | Mode ?force=1: Hapus Permanen Total
adminRouter.delete('/admin/items/:id', requireUser, (req, res) => {
  if (!isAdminUser(req.dbUser)) return res.status(403).json({ error: 'Akses ditolak.' });

  const itemId = String(req.params.id || '');
  const isForce = req.query?.force === '1' || req.query?.force === 'true' || Boolean(req.body?.force);
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
  if (!item) return res.status(404).json({ error: 'Item tidak ditemukan.' });

  // MODE 1: HAPUS PERMANEN PAKSA (untuk item rusak / bug)
  if (isForce) {
    db.transaction(() => {
      db.prepare('DELETE FROM inventory WHERE item_id = ?').run(itemId);
      db.prepare("UPDATE users SET equipped_border_id = '' WHERE equipped_border_id = ?").run(itemId);
      db.prepare("UPDATE users SET equipped_skin_id = '' WHERE equipped_skin_id = ?").run(itemId);
      db.prepare("UPDATE users SET pinned_gift_id = '' WHERE pinned_gift_id = ?").run(itemId);

      // Bersihkan juga jika item tersimpan di array JSON pinned_gifts
      try {
        const pinnedUsers = db.prepare("SELECT id, pinned_gifts FROM users WHERE pinned_gifts LIKE ?").all(`%${itemId}%`);
        const updPin = db.prepare('UPDATE users SET pinned_gifts = ? WHERE id = ?');
        for (const u of pinnedUsers) {
          const arr = JSON.parse(u.pinned_gifts || '[]').filter((gid) => String(gid) !== itemId);
          updPin.run(JSON.stringify(arr), u.id);
        }
      } catch (_) {}

      db.prepare('DELETE FROM items WHERE id = ?').run(itemId);
    })();

    logAudit(req.dbUser.id, 'HAPUS PERMANEN', `${item.name} (${itemId}) dihapus paksa dari sistem & gudang`);
    return res.json({
      ok: true,
      archived: false,
      forced: true,
      message: `Item "${item.name}" berhasil dihapus permanen dari katalog & gudang warga.`,
      catalog: getCatalog()
    });
  }

  // MODE 2: ARSIP LIMITED (default: tarik dari toko, koleksi warga tetap aman)
  const ownerRow = db.prepare('SELECT COUNT(*) AS cnt FROM inventory WHERE item_id = ?').get(itemId);
  const ownedCount = Number(ownerRow?.cnt || 0);
  const isCollabOrLimited = Boolean(
    item.is_collab ||
    item.is_limited ||
    String(item.rarity || '').toLowerCase().includes('collab') ||
    String(item.rarity || '').toLowerCase().includes('limited')
  );

  if (ownedCount > 0 || isCollabOrLimited) {
    const snapshot = JSON.stringify({
      id: item.id,
      type: item.type,
      name: item.name,
      price: item.price,
      rarity: String(item.rarity || '').toLowerCase().includes('collab') ? 'Collab · Limited' : 'Limited',
      colors: item.colors ? JSON.parse(item.colors) : ['#FFE666', '#D97706'],
      svgPath: item.svg_path || '',
      imageUrl: item.image_url || '',
      skinClass: item.skin_class || '',
      creatorName: item.creator_name || '',
      isLimited: true,
      isArchived: true
    });

    db.transaction(() => {
      db.prepare(`
        UPDATE items
        SET is_archived = 1,
            is_limited = 1,
            stock = 0,
            rarity = CASE
              WHEN LOWER(rarity) LIKE '%collab%' THEN 'Collab · Limited'
              ELSE 'Limited'
            END
        WHERE id = ?
      `).run(itemId);

      db.prepare("UPDATE inventory SET item_snapshot = ? WHERE item_id = ? AND (item_snapshot IS NULL OR item_snapshot = '')")
        .run(snapshot, itemId);
    })();

    logAudit(req.dbUser.id, 'ARSIP LIMITED', `${item.name} (${ownedCount} pemilik tetap menyimpan item)`);
    return res.json({
      ok: true,
      archived: true,
      message: `Item "${item.name}" ditarik dari Lapak & berubah menjadi LIMITED (${ownedCount} koleksi warga tetap aman).`,
      catalog: getCatalog()
    });
  }

  db.prepare('DELETE FROM items WHERE id = ?').run(itemId);
  logAudit(req.dbUser.id, 'HAPUS ITEM', `${item.name} (0 pemilik)`);
  res.json({ ok: true, archived: false, message: `Item "${item.name}" dihapus.`, catalog: getCatalog() });
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
    text: `<b>EVENT BARU: ${escHtml(title.toUpperCase())}</b>\nWaktu: <b>${escHtml(dateText)}</b>\nApresiasi: <b>${escHtml(rewardText)}</b>`,
    buttonText: 'IKUT GABUNG (RSVP)',
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

// ============================================================
// KEAMANAN KEUANGAN: PENGAJUAN ADMIN -> PERSETUJUAN OWNER
// ============================================================

// POST /api/admin/economy/request -> Admin mengajukan hadiah/PSC (Menunggu ACC Owner)
adminRouter.post('/admin/economy/request', requireUser, (req, res) => {
  if (!isAdminUser(req.dbUser)) return res.status(403).json({ error: 'Akses ditolak.' });

  const rawTarget = String(req.body?.target || '').trim().replace(/^@/, '');
  const amount = Math.floor(Number(req.body?.amount) || 0);
  const reason = String(req.body?.reason || '').trim().slice(0, 120);

  if (!rawTarget || amount < 1 || amount > 5000 || reason.length < 3) {
    return res.status(400).json({ error: 'Target, nominal (1-5000 PSC), dan alasan wajib diisi.' });
  }

  const targetUser = db.prepare('SELECT * FROM users WHERE id = ? OR LOWER(username) = LOWER(?)').get(rawTarget, rawTarget);
  if (!targetUser) return res.status(404).json({ error: 'Warga penerima tidak ditemukan.' });

  const reqId = 'req_' + crypto.randomBytes(4).toString('hex');
  db.prepare(`
    INSERT INTO psc_requests (id, requester_id, requester_name, target_id, target_name, amount, reason, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `).run(reqId, String(req.dbUser.id), req.dbUser.name, String(targetUser.id), targetUser.name, amount, reason, Date.now());

  logAudit(req.dbUser.id, 'AJUKAN PSC', `${req.dbUser.name} mengajukan ${amount} PSC untuk ${targetUser.name} (${reason})`);
  res.json({ ok: true });
});

// POST /api/admin/economy/review -> KHUSUS OWNER menyetujui atau menolak pengajuan PSC
adminRouter.post('/admin/economy/review', requireUser, (req, res) => {
  if (!isOwnerUser(req.dbUser)) {
    return res.status(403).json({ error: 'Hanya Owner Markas yang berhak memberi izin pencairan PSC.' });
  }

  const id = String(req.body?.id || '');
  const decision = String(req.body?.decision || 'reject');
  const item = db.prepare("SELECT * FROM psc_requests WHERE id = ? AND status = 'pending'").get(id);
  if (!item) return res.status(404).json({ error: 'Pengajuan sudah diproses atau tidak ditemukan.' });

  if (decision === 'approve') {
    db.prepare('UPDATE users SET psc = MAX(0, psc + ?) WHERE id = ?').run(item.amount, item.target_id);
    db.prepare("UPDATE psc_requests SET status = 'approved' WHERE id = ?").run(id);
    logAudit(req.dbUser.id, 'IZIN PSC DISETUJUI', `+${item.amount} PSC ke ${item.target_name} (ajuan ${item.requester_name})`);
  } else {
    db.prepare("UPDATE psc_requests SET status = 'rejected' WHERE id = ?").run(id);
    logAudit(req.dbUser.id, 'IZIN PSC DITOLAK', `Tolak ${item.amount} PSC untuk ${item.target_name}`);
  }

  res.json({ ok: true });
});

// POST /api/admin/economy/adjust -> Eksekusi langsung KHUSUS OWNER
adminRouter.post('/admin/economy/adjust', requireUser, (req, res) => {
  if (!isOwnerUser(req.dbUser)) {
    return res.status(403).json({ error: 'Akses ditolak. Eksekusi langsung PSC hanya untuk Owner!' });
  }

  const rawTarget = String(req.body?.target || '').trim().replace(/^@/, '');
  const amount = Number(req.body?.amount);
  const reason = String(req.body?.reason || 'Penyesuaian Owner').trim();

  if (!rawTarget || !amount || Number.isNaN(amount)) {
    return res.status(400).json({ error: 'Target warga dan nominal PSC wajib valid.' });
  }

  const targetUser = db.prepare('SELECT * FROM users WHERE id = ? OR LOWER(username) = LOWER(?)').get(rawTarget, rawTarget);
  if (!targetUser) return res.status(404).json({ error: 'Warga tidak ditemukan di database.' });

  db.prepare('UPDATE users SET psc = MAX(0, psc + ?) WHERE id = ?').run(amount, targetUser.id);
  logAudit(req.dbUser.id, 'OWNER PSC', `${amount > 0 ? '+' : ''}${amount} PSC ke ${targetUser.name} (${reason})`);

  res.json({ ok: true });
});

// POST /api/admin/roles -> Atur jabatan pengurus (KHUSUS OWNER)
adminRouter.post('/admin/roles', requireUser, (req, res) => {
  if (!isOwnerUser(req.dbUser)) {
    return res.status(403).json({ error: 'Akses ditolak. Pengaturan role hanya untuk Owner!' });
  }

  const rawTarget = String(req.body?.target || '').trim().replace(/^@/, '');
  const role = String(req.body?.role || 'member').trim().toLowerCase();
  if (!['member', 'moderator', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Role tidak valid.' });
  }

  const targetUser = db.prepare('SELECT * FROM users WHERE id = ? OR LOWER(username) = LOWER(?)').get(rawTarget, rawTarget);
  if (!targetUser) return res.status(404).json({ error: 'Warga tidak ditemukan.' });

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, targetUser.id);
  logAudit(req.dbUser.id, 'SET ROLE', `${targetUser.name} -> ${role}`);

  res.json({ ok: true });
});

// ============================================================
// MIGRASI SERVER: 1-KLIK BACKUP & RESTORE (KHUSUS OWNER_IDS)
// ============================================================

adminRouter.get('/admin/backup', (req, res) => {
  if (!isOwnerOnly(req)) {
    return res.status(403).json({ error: 'Akses ditolak. Khusus Owner Markas!' });
  }

  try {
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
