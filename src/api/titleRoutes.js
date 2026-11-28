import { Router } from 'express';
import { db } from '../database/db.js';
import { broadcastToTelegram, escHtml } from '../services/syncEngine.js';
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
  return db.prepare('SELECT * FROM users WHERE LOWER(username) = ?').get(usn);
}

export function syncAchievementTitles(userRow) {
  if (!userRow) return [];
  const usn = cleanUsn(userRow.username);
  const unlocked = new Set(parseUnlocked(userRow.unlocked_titles));
  let changed = false;

  const grant = (id) => {
    if (!unlocked.has(id)) {
      unlocked.add(id);
      changed = true;
    }
  };

  try {
    const maxSpark = db.prepare(`
      SELECT MAX(streak) AS ms FROM spark_pairs
      WHERE (LOWER(user1) = ? OR LOWER(user2) = ?) AND status = 'paired'
    `).get(usn, usn);
    if ((Number(maxSpark?.ms) || 0) >= 7) grant('first_fire');
  } catch (_) {}

  const bestStreak = Math.max(Number(userRow.streak) || 0, Number(userRow.best) || 0);
  if (bestStreak >= 14) grant('cctv');

  const missionsDone = Number(userRow.missions_done || userRow.quests_done || 0);
  if (missionsDone >= 10 || (Number(userRow.cred) || 0) >= 150) grant('kang_goreng');

  try {
    const refCount = db.prepare('SELECT COUNT(*) AS c FROM users WHERE LOWER(referred_by) = ?').get(usn);
    if ((Number(refCount?.c) || 0) >= 5) grant('mak_comblang');
  } catch (_) {}

  try {
    const highSparks = db.prepare(`
      SELECT COUNT(*) AS c FROM spark_pairs
      WHERE (LOWER(user1) = ? OR LOWER(user2) = ?)
        AND status = 'paired'
        AND (xp >= 400 OR streak >= 10)
    `).get(usn, usn);
    if ((Number(highSparks?.c) || 0) >= 3) grant('gak_napak');
  } catch (_) {}

  const list = [...unlocked];
  if (changed) {
    db.prepare('UPDATE users SET unlocked_titles = ? WHERE id = ?').run(JSON.stringify(list), userRow.id);
    userRow.unlocked_titles = JSON.stringify(list);
  }
  return list;
}

export function buildUserTitlePayload(userRow) {
  if (!userRow) return null;
  const unlockedIds = syncAchievementTitles(userRow);
  const cred = Number(userRow.cred) || 0;
  const psc = Number(userRow.psc) || 0;
  const rank = getRankByCred(cred);

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

titleRouter.get('/titles', (req, res) => {
  const authUser = req.tgUser || req.dbUser || req.user || {};
  const usn = cleanUsn(authUser.username || req.query.username);
  if (!usn) return res.status(400).json({ ok: false, message: 'Username tidak terbaca.' });

  const row = getUserRow(usn);
  if (!row) return res.status(404).json({ ok: false, message: 'Akun PunkID belum terdaftar.' });

  res.json({ ok: true, ...buildUserTitlePayload(row) });
});

titleRouter.post('/titles/action', async (req, res) => {
  try {
    const body = req.body || {};
    const type = String(body.type || '').toUpperCase();
    const titleId = String(body.titleId || '').trim();
    const authUser = req.tgUser || req.dbUser || req.user || {};
    const usn = cleanUsn(authUser.username || body.username);

    if (!usn) return res.status(400).json({ ok: false, message: 'Username tidak terbaca.' });
    const row = getUserRow(usn);
    if (!row) return res.status(404).json({ ok: false, message: 'Akun PunkID belum terdaftar.' });

    const unlocked = new Set(syncAchievementTitles(row));

    if (type === 'BUY_TITLE') {
      const item = SHOP_TITLES.find(t => t.id === titleId);
      if (!item) return res.json({ ok: false, message: 'Gelar tidak ditemukan.' });
      if (unlocked.has(item.id)) {
        return res.json({ ok: false, message: `Gelar "${item.name}" sudah kamu miliki!` });
      }
      if ((Number(row.cred) || 0) < item.minCred) {
        return res.json({ ok: false, message: `Cred kurang! Butuh minimal ${item.minCred} Cred buat nebus "${item.name}".` });
      }
      if ((Number(row.psc) || 0) < item.price) {
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

      // Siarkan otomatis ke grup untuk gelar sultan (>= 450 PSC)
      if (item.price >= 450) {
        await broadcastToTelegram({
          target: 'group',
          text:
            `🏷️ <b>GELAR BARU DITEBUS!</b>\n` +
            `<b>${escHtml(row.name || usn)}</b> baru aja bakar <b>${item.price} PSC</b> buat pasang gelar <b>"${escHtml(item.name)}"</b> di PunkID!`,
          buttonText: '🪪 CEK PUNKID',
          startParam: 'gue',
          feedText: `${row.name || usn} baru menebus gelar "${item.name}" (${item.price} PSC)!`
        }).catch(() => {});
      }

      const updated = getUserRow(usn);
      return res.json({
        ok: true,
        message: `🔥 Gelar "${item.name}" resmi kebeli & langsung terpasang! (-${item.price} PSC)`,
        ...buildUserTitlePayload(updated)
      });
    }

    if (type === 'EQUIP_TITLE') {
      if (!titleId) {
        db.prepare("UPDATE users SET active_title = '' WHERE id = ?").run(row.id);
        const updated = getUserRow(usn);
        return res.json({
          ok: true,
          message: `Balik pakai pangkat default: ${getRankByCred(row.cred).title}`,
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
