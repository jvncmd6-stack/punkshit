import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../../database/db.js';
import { requireUser } from '../../middlewares/authTma.js';
import { broadcastToTelegram, escHtml } from '../../services/syncEngine.js';
import { isAdminUser, isOwnerUser, logAudit } from './adminHelpers.js';

export const adminCommunityRouter = Router();

adminCommunityRouter.get('/admin/overview', requireUser, (req, res) => {
  if (!isAdminUser(req.dbUser)) {
    return res.status(403).json({ error: 'Khusus pengurus Ruang Dalang.' });
  }

  let pendingMenfess = [];
  try {
    pendingMenfess = db.prepare("SELECT * FROM menfess WHERE status = 'pending' ORDER BY created_at ASC LIMIT 30").all();
  } catch (_) {}

  let pendingCollabs = [];
  try {
    pendingCollabs = db.prepare("SELECT * FROM item_submissions WHERE status = 'pending' ORDER BY created_at ASC LIMIT 20").all();
  } catch (_) {}

  let pscRequests = [];
  try {
    pscRequests = db.prepare("SELECT * FROM psc_requests WHERE status = 'pending' ORDER BY created_at ASC LIMIT 30").all();
  } catch (_) {}

  const users = db.prepare(
    'SELECT id, name, username, role, psc, cred, COALESCE(is_frozen, 0) AS isFrozen, photo_url AS photoUrl FROM users ORDER BY cred DESC LIMIT 100'
  ).all();

  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 20').all();

  res.json({ pendingMenfess, pendingCollabs, pscRequests, users, logs });
});

adminCommunityRouter.post('/admin/users/freeze', requireUser, (req, res) => {
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

adminCommunityRouter.post('/admin/broadcast', requireUser, async (req, res) => {
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

adminCommunityRouter.post('/admin/events', requireUser, async (req, res) => {
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

adminCommunityRouter.post('/admin/polls', requireUser, async (req, res) => {
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

adminCommunityRouter.post('/admin/menfess/review', requireUser, async (req, res) => {
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
