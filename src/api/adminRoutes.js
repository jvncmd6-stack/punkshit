import { Router } from 'express';
import { db } from '../database/db.js';
import { requireUser } from '../middlewares/authTma.js';

export const adminRouter = Router();

function isAdminUser(user) {
  if (!user) return false;
  const ownerIds = (process.env.OWNER_IDS || '').split(',').map((s) => s.trim());
  if (ownerIds.includes(String(user.id))) return true;
  return user.role === 'owner' || user.role === 'admin' || user.role === 'moderator';
}

// GET /api/admin/stats -> Statistik markas & daftar warga untuk manajemen admin
adminRouter.get('/admin/stats', requireUser, (req, res) => {
  if (!isAdminUser(req.dbUser)) {
    return res.status(403).json({ error: 'Khusus penguasa markas (Admin) doang cuy.' });
  }

  const totalUsers = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  const totalWaitingRadio = db.prepare("SELECT COUNT(*) AS c FROM radio_queue WHERE status = 'waiting'").get().c;
  const users = db.prepare('SELECT id, name, username, role, cred, avatar FROM users ORDER BY cred DESC LIMIT 100').all();

  res.json({ totalUsers, totalWaitingRadio, users });
});

// POST /api/admin/add-coin -> Tambah atau kurangi saldo PSC warga
adminRouter.post('/admin/add-coin', requireUser, (req, res) => {
  if (!isAdminUser(req.dbUser)) {
    return res.status(403).json({ error: 'Akses ditolak.' });
  }

  const targetId = String(req.body?.targetUserId || '').trim();
  const amount = Number(req.body?.amount);

  if (!targetId || Number.isNaN(amount) || amount === 0) {
    return res.status(400).json({ error: 'ID warga dan nominal koin wajib diisi.' });
  }

  const target = db.prepare('SELECT id, name, cred FROM users WHERE id = ?').get(targetId);
  if (!target) {
    return res.status(404).json({ error: 'Warga kaga ketemu di database.' });
  }

  db.prepare('UPDATE users SET cred = MAX(0, cred + ?) WHERE id = ?').run(amount, targetId);
  const updated = db.prepare('SELECT id, name, cred FROM users WHERE id = ?').get(targetId);

  res.json({ ok: true, user: updated });
});

// POST /api/admin/set-role -> Ubah jabatan warga (member / moderator / admin)
adminRouter.post('/admin/set-role', requireUser, (req, res) => {
  if (!isAdminUser(req.dbUser)) {
    return res.status(403).json({ error: 'Akses ditolak.' });
  }

  const targetId = String(req.body?.targetUserId || '').trim();
  const role = String(req.body?.role || 'member').trim().toLowerCase();
  if (!['member', 'moderator', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Role tidak valid.' });
  }

  const target = db.prepare('SELECT id FROM users WHERE id = ?').get(targetId);
  if (!target) {
    return res.status(404).json({ error: 'Warga kaga ketemu.' });
  }

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, targetId);
  res.json({ ok: true });
});
