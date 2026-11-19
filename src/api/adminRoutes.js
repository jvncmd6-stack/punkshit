import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../database/db.js';
import { requireUser } from '../middlewares/authTma.js';
import { formatUser, broadcastToTelegram, escHtml } from '../services/syncEngine.js';

export const adminRouter = Router();

// Middleware khusus Owner / Admin / Moderator
function requireAdmin(req, res, next) {
  const u = req.dbUser;
  if (!u || !['owner', 'admin', 'moderator'].includes(u.role)) {
    return res.status(403).json({ error: 'Akses ditolak! Khusus Penguasa / Ruang Dalang.' });
  }
  next();
}

// GET /api/admin/stats -> Statistik & data awal Ruang Dalang
adminRouter.get('/admin/stats', requireUser, requireAdmin, (req, res) => {
  const totalUsers = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  const totalPsc = db.prepare('SELECT SUM(psc) AS s FROM users').get().s || 0;
  const pendingMenfess = db.prepare('SELECT COUNT(*) AS c FROM menfess WHERE status = ?').get('pending').c;
  const users = db.prepare('SELECT id, username, name, member_no AS memberNo, role, psc, cred, streak FROM users ORDER BY created_at DESC LIMIT 50').all();

  res.json({ totalUsers, totalPsc, pendingMenfess, users });
});

// GET /api/admin/menfess -> Daftar Kotak Rahasia (Menfess) yang menunggu moderasi
adminRouter.get('/admin/menfess', requireUser, requireAdmin, (req, res) => {
  const list = db.prepare(`
    SELECT m.id, m.category, m.text, m.created_at AS createdAt, u.name AS senderName, u.username AS senderUsername
    FROM menfess m
    LEFT JOIN users u ON m.sender_id = u.id
    WHERE m.status = 'pending'
    ORDER BY m.created_at DESC
  `).all();

  res.json({ list });
});

// POST /api/admin/menfess/action -> Terima atau tolak Menfess
adminRouter.post('/admin/menfess/action', requireUser, requireAdmin, async (req, res) => {
  const { menfessId, action } = req.body || {};
  const mf = db.prepare('SELECT * FROM menfess WHERE id = ?').get(menfessId);
  if (!mf) return res.status(404).json({ error: 'Kotak rahasia tidak ditemukan.' });

  if (action === 'approve') {
    db.prepare('UPDATE menfess SET status = ? WHERE id = ?').run('approved', menfessId);
    await broadcastToTelegram({
      target: 'group',
      text: `📦 <b>KOTAK RAHASIA (${escHtml(mf.category || 'Confession')})</b>\n\n<i>"${escHtml(mf.text)}"</i>`,
      buttonText: '📦 KIRIM MENFESS',
      startParam: 'kotak',
      feedText: `Kotak Rahasia baru diterbitkan Dalang: "${mf.text.slice(0, 60)}..."`
    });
  } else {
    db.prepare('UPDATE menfess SET status = ? WHERE id = ?').run('rejected', menfessId);
  }

  res.json({ ok: true });
});

// POST /api/admin/user/psc -> Tambah / kurangi saldo PSC warga dari Ruang Dalang
adminRouter.post('/admin/user/psc', requireUser, requireAdmin, (req, res) => {
  const targetRaw = String(req.body?.target || '').trim().replace(/^@/, '');
  const amount = Math.floor(Number(req.body?.amount) || 0);
  const note = String(req.body?.note || 'Kiriman dari Ruang Dalang').trim().slice(0, 60);

  if (!targetRaw || !amount) {
    return res.status(400).json({ error: 'Target user dan nominal PSC wajib diisi.' });
  }

  const target = db.prepare('SELECT * FROM users WHERE id = ? OR LOWER(username) = LOWER(?)').get(targetRaw, targetRaw);
  if (!target) return res.status(404).json({ error: `Warga "${targetRaw}" tidak ditemukan.` });

  const now = Date.now();
  const tx = db.transaction(() => {
    db.prepare('UPDATE users SET psc = MAX(0, psc + ?) WHERE id = ?').run(amount, target.id);
    db.prepare('INSERT INTO transactions (user_id, type, amount, note, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(target.id, 'admin_adjust', amount, note, now);
  });
  tx();

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(target.id);
  res.json({ ok: true, user: formatUser(updated) });
});

// POST /api/admin/user/role -> Ubah role warga (owner / admin / moderator / member)
adminRouter.post('/admin/user/role', requireUser, requireAdmin, (req, res) => {
  if (req.dbUser.role !== 'owner') {
    return res.status(403).json({ error: 'Hanya Owner yang bisa mengubah pangkat/role.' });
  }
  const targetRaw = String(req.body?.target || '').trim().replace(/^@/, '');
  const role = String(req.body?.role || 'member').trim();
  if (!['owner', 'admin', 'moderator', 'member'].includes(role)) {
    return res.status(400).json({ error: 'Role tidak valid.' });
  }

  const target = db.prepare('SELECT * FROM users WHERE id = ? OR LOWER(username) = LOWER(?)').get(targetRaw, targetRaw);
  if (!target) return res.status(404).json({ error: 'Warga tidak ditemukan.' });

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, target.id);
  res.json({ ok: true });
});

// POST /api/admin/broadcast -> Siaran pengumuman Dalang ke Grup Telegram & Feed
adminRouter.post('/admin/broadcast', requireUser, requireAdmin, async (req, res) => {
  const message = String(req.body?.message || '').trim().slice(0, 500);
  if (message.length < 3) return res.status(400).json({ error: 'Pesan siaran terlalu pendek.' });

  await broadcastToTelegram({
    target: 'group',
    text: `📢 <b>PENGUMUMAN MARKAS</b>\n\n${escHtml(message)}`,
    buttonText: '🔥 BUKA PUNKSHIT.OS',
    feedText: `[PENGUMUMAN] ${message.slice(0, 90)}`
  });

  res.json({ ok: true });
});

// POST /api/admin/poll -> Buat Sidang Warga (Voting) baru
adminRouter.post('/admin/poll', requireUser, requireAdmin, async (req, res) => {
  const question = String(req.body?.question || '').trim().slice(0, 140);
  const rawOptions = Array.isArray(req.body?.options) ? req.body.options : [];
  const options = rawOptions
    .map(o => String(o || '').trim().slice(0, 50))
    .filter(Boolean)
    .map(label => ({ label, votes: 0 }));

  if (question.length < 5 || options.length < 2) {
    return res.status(400).json({ error: 'Pertanyaan dan minimal 2 pilihan wajib diisi.' });
  }

  const id = 'pl_' + crypto.randomBytes(4).toString('hex');
  db.prepare('INSERT INTO polls (id, question, options_json, created_at) VALUES (?, ?, ?, ?)')
    .run(id, question, JSON.stringify(options), Date.now());

  await broadcastToTelegram({
    target: 'group',
    text: `⚖️ <b>SIDANG WARGA DIBUKA!</b>\n\n<b>${escHtml(question)}</b>\n\nMasuk ke Mini App buat nyoblos suara lu!`,
    buttonText: '⚖️ IKUT SIDANG',
    startParam: 'sidang',
    feedText: `Sidang Warga dibuka: ${question}`
  });

  res.json({ ok: true, id });
});

export default adminRouter;
