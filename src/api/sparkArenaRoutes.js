import { Router } from 'express';
import { db } from '../database/db.js';
import { requireUser } from '../middlewares/authTma.js';
import { formatUser, getCatalog } from '../services/syncEngine.js';

export const sparkArenaRouter = Router();

db.exec(`
  CREATE TABLE IF NOT EXISTS spark_shields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    partner_username TEXT NOT NULL,
    item_id TEXT NOT NULL,
    activated_date TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

function cleanUsn(v) {
  return String(v || '').trim().replace(/^@+/, '').toLowerCase();
}

function todayWib() {
  const now = new Date(Date.now() + 7 * 3600 * 1000);
  return now.toISOString().slice(0, 10);
}

// 1. GET /api/spark/coop-status -> Info partner Spark aktif & status shield hari ini
sparkArenaRouter.get('/spark/coop-status', requireUser, (req, res) => {
  const u = req.dbUser;
  const usn = cleanUsn(u.username || req.tgUser?.username);
  if (!usn) {
    return res.json({ hasCoop: false, partners: [], activeShields: [] });
  }

  let pairs = [];
  try {
    pairs = db.prepare(`
      SELECT user1, user2, streak, xp
      FROM spark_pairs
      WHERE (user1 = ? OR user2 = ?) AND status = 'paired'
      ORDER BY id ASC
    `).all(usn, usn);
  } catch (_) {}

  const partners = pairs.map((p) => {
    const partnerUsn = p.user1 === usn ? p.user2 : p.user1;
    return {
      partnerUsername: partnerUsn,
      streak: p.streak || 0,
      xp: p.xp || 0,
      coopBonusPct: 15
    };
  });

  const today = todayWib();
  const activeShields = db.prepare(`
    SELECT partner_username, item_id, activated_date
    FROM spark_shields
    WHERE username = ? AND activated_date = ?
  `).all(usn, today);

  res.json({
    hasCoop: partners.length > 0,
    partners,
    activeShields
  });
});

// 2. POST /api/spark/shield -> Pakai 1 item di gudang sebagai Spark Shield untuk hari ini
sparkArenaRouter.post('/spark/shield', requireUser, (req, res) => {
  const u = req.dbUser;
  const usn = cleanUsn(u.username || req.tgUser?.username);
  const partnerUsn = cleanUsn(req.body?.partnerUsername);
  const invId = Number(req.body?.invId);

  if (!usn) {
    return res.status(400).json({ error: 'Username Telegram kamu belum terbaca.' });
  }
  if (!partnerUsn) {
    return res.status(400).json({ error: 'Pilih partner Spark terlebih dahulu.' });
  }
  if (!invId) {
    return res.status(400).json({ error: 'Pilih item dari gudang untuk dijadikan Spark Shield.' });
  }

  const pair = db.prepare(`
    SELECT id FROM spark_pairs
    WHERE status = 'paired'
      AND ((user1 = ? AND user2 = ?) OR (user1 = ? AND user2 = ?))
  `).get(usn, partnerUsn, partnerUsn, usn);

  if (!pair) {
    return res.status(400).json({ error: `Kamu belum resmi berpasangan Spark dengan @${partnerUsn}.` });
  }

  const today = todayWib();
  const existing = db.prepare(`
    SELECT id FROM spark_shields
    WHERE username = ? AND partner_username = ? AND activated_date = ?
  `).get(usn, partnerUsn, today);

  if (existing) {
    return res.status(400).json({ error: `Spark Shield untuk @${partnerUsn} sudah aktif hari ini!` });
  }

  const invRow = db.prepare('SELECT * FROM inventory WHERE id = ? AND user_id = ?').get(invId, u.id);
  if (!invRow) {
    return res.status(404).json({ error: 'Item tidak ditemukan di gudang kamu.' });
  }

  const catalog = getCatalog();
  const itemMeta = catalog.find((i) => i.id === invRow.item_id) || { name: invRow.item_id };

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM inventory WHERE id = ? AND user_id = ?').run(invRow.id, u.id);
    db.prepare(`
      INSERT INTO spark_shields (username, partner_username, item_id, activated_date, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(usn, partnerUsn, invRow.item_id, today, Date.now());
  });
  tx();

  const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(u.id);
  const updatedInv = db.prepare(
    'SELECT id, item_id AS itemId, acquired_at AS acquiredAt FROM inventory WHERE user_id = ? ORDER BY id DESC'
  ).all(u.id);

  res.json({
    ok: true,
    message: `Spark Shield aktif untuk @${partnerUsn} menggunakan "${itemMeta.name}"!`,
    user: formatUser(updatedUser),
    inv: updatedInv
  });
});
