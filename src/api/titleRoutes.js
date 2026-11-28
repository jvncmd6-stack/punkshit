import { Router } from 'express';
import { db } from '../database/db.js';
import {
  CRED_RANKS,
  SHOP_TITLES,
  ACHIEVEMENT_TITLES,
  getRankByCred
} from '../config/punkTitles.js';

export const titleRouter = Router();

try { db.exec("ALTER TABLE users ADD COLUMN active_title TEXT DEFAULT ''"); } catch (_) {}
try { db.exec("ALTER TABLE users ADD COLUMN unlocked_titles TEXT DEFAULT '[]'"); } catch (_) {}

function cleanUsn(v) {
  return String(v || '').trim().replace(/^@+/, '').toLowerCase();
}

function parseUnlocked(raw) {
  if (!raw) return [];
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch (_) {
    return [];
  }
}

function getUserRow(username) {
  const usn = cleanUsn(username);
  if (!usn) return null;
  return db.prepare(`
    SELECT id, username, COALESCE(psc, 0) AS psc, COALESCE(cred, 0) AS cred,
           COALESCE(active_title, '') AS active_title,
           COALESCE(unlocked_titles, '[]') AS unlocked_titles
    FROM users
    WHERE LOWER(username) = ?
  `).get(usn);
}

export function buildUserTitlePayload(userRow) {
  if (!userRow) return null;
  const cred = Number(userRow.cred) || 0;
  const psc = Number(userRow.psc) || 0;
  const rank = getRankByCred(cred);
  const unlockedIds = parseUnlocked(userRow.unlocked_titles);

  const allCatalog = [
    ...SHOP_TITLES.map(t => ({ ...t, category: 'shop' })),
    ...ACHIEVEMENT_TITLES.map(t => ({ ...t, category: 'achievement', price: 0, minCred: 0 }))
  ];

  const activeObj = allCatalog.find(t => t.id === userRow.active_title) || null;

  return {
    username: userRow.username,
    psc,
    cred,
    rank,
    activeTitleId: activeObj ? activeObj.id : '',
    activeTitleName: activeObj ? activeObj.name : rank.title,
    unlockedIds,
    shopTitles: SHOP_TITLES.map(t => ({
      ...t,
      unlocked: unlockedIds.includes(t.id),
      equipped: activeObj?.id === t.id,
      canAfford: psc >= t.price,
      credMet: cred >= t.minCred
    })),
    achievementTitles: ACHIEVEMENT_TITLES.map(t => ({
      ...t,
      unlocked: unlockedIds.includes(t.id),
      equipped: activeObj?.id === t.id
    })),
    credRanks: CRED_RANKS
  };
}

// Ambil daftar pangkat, saldo, dan koleksi gelar user
titleRouter.get('/titles', (req, res) => {
  const authUser = req.tgUser || req.dbUser || req.user || {};
  const usn = cleanUsn(authUser.username || req.query.username);
  if (!usn) return res.status(400).json({ ok: false, message: 'Username tidak terbaca.' });

  const row = getUserRow(usn);
  if (!row) return res.status(404).json({ ok: false, message: 'Akun PunkID belum terdaftar.' });

  res.json({ ok: true, ...buildUserTitlePayload(row) });
});

// Beli atau Pasang/Lepas Gelar
titleRouter.post('/titles/action', (req, res) => {
  try {
    const body = req.body || {};
    const type = String(body.type || '').toUpperCase();
    const titleId = String(body.titleId || '').trim();
    const authUser = req.tgUser || req.dbUser || req.user || {};
    const usn = cleanUsn(authUser.username || body.username);

    if (!usn) return res.status(400).json({ ok: false, message: 'Username tidak terbaca.' });
    const row = getUserRow(usn);
    if (!row) return res.status(404).json({ ok: false, message: 'Akun PunkID belum terdaftar.' });

    const unlocked = new Set(parseUnlocked(row.unlocked_titles));

    // 1. Beli Gelar dari Toko Tongkrongan
    if (type === 'BUY_TITLE') {
      const item = SHOP_TITLES.find(t => t.id === titleId);
      if (!item) return res.json({ ok: false, message: 'Gelar tidak ditemukan.' });
      if (unlocked.has(item.id)) {
        return res.json({ ok: false, message: `Gelar "${item.name}" sudah kamu miliki!` });
      }
      if (row.cred < item.minCred) {
        return res.json({ ok: false, message: `Cred kurang! Butuh minimal ${item.minCred} Cred buat nebus "${item.name}".` });
      }
      if (row.psc < item.price) {
        return res.json({ ok: false, message: `Saldo PSC kurang! Butuh ${item.price} PSC.` });
      }

      unlocked.add(item.id);
      db.prepare(`
        UPDATE users
        SET psc = psc - ?,
            unlocked_titles = ?,
            active_title = ?
        WHERE id = ?
      `).run(item.price, JSON.stringify([...unlocked]), item.id, row.id);

      const updated = getUserRow(usn);
      return res.json({
        ok: true,
        message: `🔥 Gelar "${item.name}" resmi kebeli & langsung terpasang! (-${item.price} PSC)`,
        ...buildUserTitlePayload(updated)
      });
    }

    // 2. Pasang Gelar yang Sudah Dimiliki
    if (type === 'EQUIP_TITLE') {
      if (!titleId) {
        // Kembali pakai pangkat Cred default
        db.prepare("UPDATE users SET active_title = '' WHERE id = ?").run(row.id);
        const updated = getUserRow(usn);
        return res.json({
          ok: true,
          message: `Balik pakai pangkat default: ${updated.activeTitleName || getRankByCred(row.cred).title}`,
          ...buildUserTitlePayload(updated)
        });
      }

      if (!unlocked.has(titleId)) {
        return res.json({ ok: false, message: 'Kamu belum punya gelar ini.' });
      }

      const found = [...SHOP_TITLES, ...ACHIEVEMENT_TITLES].find(t => t.id === titleId);
      db.prepare('UPDATE users SET active_title = ? WHERE id = ?').run(titleId, row.id);

      const updated = getUserRow(usn);
      return res.json({
        ok: true,
        message: `✅ Gelar "${found ? found.name : titleId}" dipasang ke PunkID!`,
        ...buildUserTitlePayload(updated)
      });
    }

    return res.json({ ok: false, message: 'Aksi tidak dikenal.' });
  } catch (err) {
    console.error('[Title Action Error]:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});
