import { Router } from 'express';
import { db } from '../database/db.js';
import { requireUser } from '../middlewares/authTma.js';
import { formatUser, broadcastToTelegram, escHtml } from '../services/syncEngine.js';

export const adminRouter = Router();

// Middleware khusus Admin / Owner
function requireAdmin(req, res, next) {
  const u = req.dbUser;
  if (!u || (u.role !== 'owner' && u.role !== 'admin' && u.role !== 'moderator')) {
    return res.status(403).json({ error: 'Akses ditolak! Khusus Penguasa / Dalang.' });
  }
  next();
}

// GET /api/admin/stats -> Statistik Ringkas Ruang Dalang
adminRouter.get('/admin/stats', requireUser, requireAdmin, (req, res) => {
  const totalUsers = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  const totalPsc = db.prepare('SELECT SUM(psc) AS s FROM users').get().s || 0;
  const pendingMenfess = db.prepare('SELECT COUNT(*) AS c FROM menfess WHERE status = ?').get('pending').c;
  res.json({ totalUsers, totalPsc, pendingMenfess });
});

// GET /api/admin/menfess -> Daftar Menfess Pending untuk dimoderasi Dalang
adminRouter.get('/admin/menfess', requireUser, requireAdmin, (req, res) => {
  const list = db.prepare('SELECT m.id, m.category, m.text, u.name AS senderName FROM menfess m LEFT JOIN users u ON m.sender_id = u.id WHERE m.status = ? ORDER BY m.id DESC').all('pending');
  res.json({ list });
});

// POST /api/admin/menfess/action -> Approve / Reject Menfess
adminRouter.post('/admin/menfess/action', requireUser, requireAdmin, async (req, res) => {
  const { menfessId, action } = req.body || {};
  const mf = db.prepare('SELECT * FROM menfess WHERE id = ?').get(menfessId);
  if (!mf) return res.status(404).json({ error: 'Kotak rahasia tidak ditemukan.' });

  if (action === 'approve') {
    db.prepare('UPDATE menfess SET status = ? WHERE id = ?').run('approved', menfessId);
    await broadcastToTelegram({
      target: 'group',
      text: `📦 <b>KOTAK RAHASIA DIBUKA DALANG!</b>\n<i>"${escHtml(mf.text)}"</i>`,
      buttonText: '📦 BUKA KOTAK',
      startParam: 'kotak'
    });
  } else {
    db.prepare('UPDATE menfess SET status = ? WHERE id = ?').run('rejected', menfessId);
  }

  res.json({ ok: true });
});
