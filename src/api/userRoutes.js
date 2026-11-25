import { Router } from 'express';
import { ENV } from '../config/env.js';
import { db } from '../database/db.js';
import { requireUser } from '../middlewares/authTma.js';
import { uploadMem, processAndSaveImage } from '../middlewares/upload.js';
import {
  formatUser,
  parsePinnedGifts,
  getCatalog,
  getOnlineUsers,
  syncTelegramAvatar,
  broadcastToTelegram,
  escHtml
} from '../services/syncEngine.js';

export const userRouter = Router();

function getFullCatalogMap() {
  const map = new Map();
  // Ambil dari getCatalog(true) kalau mendukung flag includeArchived, atau getCatalog()
  let baseList = [];
  try {
    baseList = getCatalog(true) || getCatalog() || [];
  } catch (_) {
    baseList = getCatalog() || [];
  }
  for (const it of baseList) {
    if (it && it.id) map.set(String(it.id), it);
  }

  // Pastikan item yang di-archive di tabel database tetap masuk map agar tidak hilang dari profil
  const candidateTables = ['shop_items', 'items', 'catalog_items'];
  for (const tbl of candidateTables) {
    try {
      const rows = db.prepare(`SELECT * FROM ${tbl}`).all();
      for (const r of rows) {
        const id = String(r.id || r.item_id || '');
        if (!id || map.has(id)) continue;
        let colors = null;
        try { if (r.colors_json) colors = JSON.parse(r.colors_json); } catch (_) {}
        try { if (!colors && r.colors) colors = typeof r.colors === 'string' ? JSON.parse(r.colors) : r.colors; } catch (_) {}
        map.set(id, {
          id,
          type: r.type || 'gift',
          name: r.name || id,
          rarity: r.rarity || 'Limited',
          price: Number(r.price || 0),
          stock: Number(r.stock ?? 0),
          imageUrl: r.image_url || r.imageUrl || '',
          svgPath: r.svg_path || r.svgPath || '',
          colors: Array.isArray(colors) ? colors : ['#ffd633', '#f59e0b'],
          skinClass: r.skin_class || r.skinClass || '',
          isLimited: Boolean(r.is_limited || r.is_archived || String(r.rarity || '').toLowerCase().includes('limited')),
          isArchived: Boolean(r.is_archived)
        });
      }
    } catch (_) {}
  }
  return map;
}

function attachExtraUserFields(row) {
  const formatted = formatUser(row);
  if (formatted && row) {
    formatted.streakShield = Number(row.streak_shield || 0);
    const catalogMap = getFullCatalogMap();
    const pinnedIds = Array.isArray(formatted.pinnedGifts)
      ? formatted.pinnedGifts
      : parsePinnedGifts(row.pinned_gift_id);
    formatted.pinnedGifts = pinnedIds;
    formatted.pinnedGiftItems = pinnedIds
      .map(gid => catalogMap.get(String(gid)))
      .filter(Boolean);
  }
  return formatted;
}

// GET /api/me -> Sinkronisasi state awal + konfigurasi URL Grup/Channel
userRouter.get('/me', async (req, res) => {
  const uid = String(req.tgUser.id);
  let user = req.dbUser;

  if (user && !user.photo_url) {
    await syncTelegramAvatar(uid, req.tgUser);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(uid);
  }

  const catalogMap = getFullCatalogMap();

  const rawInv = user
    ? db.prepare('SELECT id, item_id AS itemId, acquired_at AS acquiredAt FROM inventory WHERE user_id = ? ORDER BY id DESC').all(uid)
    : [];

  // Sertakan metadata item di inv + pastikan item yang dimiliki user tetap ada di catalog
  const activeCatalog = getCatalog() || [];
  const activeIds = new Set(activeCatalog.map(x => String(x.id)));
  const mergedCatalog = [...activeCatalog];

  const inv = rawInv.map(entry => {
    const meta = catalogMap.get(String(entry.itemId));
    if (meta && !activeIds.has(String(meta.id))) {
      activeIds.add(String(meta.id));
      mergedCatalog.push({ ...meta, isArchived: true, isLimited: true });
    }
    return meta ? { ...meta, ...entry } : entry;
  });

  const feed = db.prepare('SELECT id, text, created_at AS createdAt FROM feed ORDER BY id DESC LIMIT 12').all();

  const events = db.prepare('SELECT * FROM events ORDER BY created_at DESC LIMIT 15').all().map(ev => {
    const rsvpCount = db.prepare('SELECT COUNT(*) AS c FROM event_rsvps WHERE event_id = ?').get(ev.id).c;
    const joined = user
      ? Boolean(db.prepare('SELECT 1 FROM event_rsvps WHERE event_id = ? AND user_id = ?').get(ev.id, uid))
      : false;
    return {
      id: ev.id,
      type: ev.type,
      title: ev.title,
      dateText: ev.date_text,
      description: ev.description,
      rewardText: ev.reward_text,
      rsvpCount,
      joined
    };
  });

  const wanted = db.prepare('SELECT * FROM wanted ORDER BY created_at DESC LIMIT 15').all().map(w => {
    const joined = db.prepare('SELECT COUNT(*) AS c FROM wanted_joins WHERE wanted_id = ?').get(w.id).c;
    return {
      id: w.id,
      authorId: w.author_id,
      authorName: w.author_name,
      category: w.category,
      slots: w.slots,
      note: w.note,
      joined
    };
  });

  const polls = db.prepare('SELECT * FROM polls ORDER BY created_at DESC LIMIT 10').all().map(p => {
    const opts = JSON.parse(p.options_json || '[]');
    const totalVotes = opts.reduce((acc, o) => acc + (o.votes || 0), 0);
    return { id: p.id, question: p.question, options: opts, totalVotes };
  });

  res.json({
    config: {
      groupUrl: (process.env.GROUP_URL || '').trim(),
      channelUrl: (process.env.CHANNEL_URL || '').trim(),
      miniappLink: ENV.MINIAPP_LINK
    },
    user: attachExtraUserFields(user),
    inv,
    catalog: mergedCatalog,
    onlineUsers: getOnlineUsers(),
    feed,
    events,
    wanted,
    polls
  });
});

// POST /api/register -> Aktivasi PunkID pertama kali
userRouter.post('/register', async (req, res) => {
  if (req.dbUser) {
    return res.json({ user: attachExtraUserFields(req.dbUser), inv: [] });
  }

  const uid = String(req.tgUser.id);
  const rawName = String(req.body?.name || req.tgUser.first_name || 'Warga').trim().slice(0, 24);
  if (rawName.length < 2) {
    return res.status(400).json({ error: 'Nama minimal 2 karakter cuy.' });
  }

  const totalUsers = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  const memberNo = `PSK-${String(1001 + totalUsers).padStart(4, '0')}`;
  const role = (ENV.OWNER_IDS || []).includes(uid) ? 'owner' : 'member';
  const now = Date.now();

  db.prepare(`
    INSERT INTO users (id, username, name, member_no, role, psc, presence, presence_at, created_at)
    VALUES (?, ?, ?, ?, ?, 110, '🔥 Baru Masuk Markas', ?, ?)
  `).run(uid, req.tgUser.username || '', rawName, memberNo, role, now, now);

  db.prepare('INSERT INTO transactions (user_id, type, amount, note, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(uid, 'bonus', 110, 'Modal awal warga baru PunkID', now);

  await syncTelegramAvatar(uid, req.tgUser);
  const freshUser = db.prepare('SELECT * FROM users WHERE id = ?').get(uid);

  await broadcastToTelegram({
    target: 'group',
    text: `🪪 <b>WARGA BARU RESMI GABUNG!</b>\n<b>${escHtml(rawName)}</b> (${memberNo}) baru aja cetak PunkID dan mampir ke markas. Selamat datang di tongkrongan!`,
    buttonText: '🪪 LIHAT MARKAS',
    feedText: `Warga baru ${rawName} (${memberNo}) resmi gabung ke markas!`
  });

  res.json({ user: attachExtraUserFields(freshUser), inv: [] });
});

// POST /api/profile/banner -> Upload gambar/GIF latar belakang profil
userRouter.post('/profile/banner', requireUser, uploadMem.single('banner'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Pilih file gambar banner-nya dulu cuy.' });
    }
    const publicPath = await processAndSaveImage(req.file, 'banners', { width: 900, height: 450, fit: 'cover' });
    db.prepare('UPDATE users SET banner_url = ? WHERE id = ?').run(publicPath, req.dbUser.id);
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.dbUser.id);
    res.json({ user: attachExtraUserFields(updated) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/profile -> Update nama, bio, link Spotify, & ring avatar
userRouter.post('/profile', requireUser, (req, res) => {
  const name = String(req.body?.name || req.dbUser.name).trim().slice(0, 24);
  const bio = String(req.body?.bio || '').trim().slice(0, 90);
  const spotifyUrl = String(req.body?.spotifyUrl || '').trim().slice(0, 200);
  const ringStyle = Math.max(0, Math.min(3, Number(req.body?.ringStyle) || 0));

  if (name.length < 2) return res.status(400).json({ error: 'Nama minimal 2 huruf ya.' });

  db.prepare(`
    UPDATE users SET name = ?, bio = ?, spotify_url = ?, ring_style = ? WHERE id = ?
  `).run(name, bio, spotifyUrl, ringStyle, req.dbUser.id);

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.dbUser.id);
  res.json({ user: attachExtraUserFields(updated) });
});

// POST /api/profile/sync-telegram -> Tarik ulang foto profil & username terbaru dari Telegram
userRouter.post('/profile/sync-telegram', requireUser, async (req, res) => {
  const firstName = req.tgUser.first_name || '';
  const lastName = req.tgUser.last_name || '';
  const tgFullName = `${firstName} ${lastName}`.trim().slice(0, 24) || req.dbUser.name;

  db.prepare('UPDATE users SET username = ?, name = ? WHERE id = ?')
    .run(req.tgUser.username || '', tgFullName, req.dbUser.id);

  await syncTelegramAvatar(req.dbUser.id, req.tgUser);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.dbUser.id);
  res.json({ user: attachExtraUserFields(updated) });
});

// POST /api/profile/equip -> Pasang / lepas Border Avatar, Multi-Gift Profil (>1), atau Card Skin
userRouter.post('/profile/equip', requireUser, (req, res) => {
  const { type, itemId, itemIds } = req.body || {};
  const uid = req.dbUser.id;

  if (itemId) {
    const owned = db.prepare('SELECT 1 FROM inventory WHERE user_id = ? AND item_id = ?').get(uid, itemId);
    if (!owned) return res.status(403).json({ error: 'Item ini belum ada di Gudang Barang lo cuy.' });
  }

  if (type === 'border') {
    db.prepare('UPDATE users SET equipped_border_id = ? WHERE id = ?').run(itemId || '', uid);
  } else if (type === 'skin') {
    db.prepare('UPDATE users SET equipped_skin_id = ? WHERE id = ?').run(itemId || '', uid);
  } else if (type === 'pin') {
    if (Array.isArray(itemIds)) {
      const validIds = [];
      for (const id of itemIds) {
        const cleanId = String(id || '').trim();
        if (!cleanId || validIds.includes(cleanId)) continue;
        const owned = db.prepare('SELECT 1 FROM inventory WHERE user_id = ? AND item_id = ?').get(uid, cleanId);
        if (owned) validIds.push(cleanId);
        if (validIds.length >= 6) break;
      }
      db.prepare('UPDATE users SET pinned_gift_id = ? WHERE id = ?')
        .run(validIds.length ? JSON.stringify(validIds) : '', uid);
    } else if (!itemId) {
      db.prepare('UPDATE users SET pinned_gift_id = ? WHERE id = ?').run('', uid);
    } else {
      const curList = parsePinnedGifts(req.dbUser.pinned_gift_id);
      const targetId = String(itemId).trim();
      let nextList;
      if (curList.includes(targetId)) {
        nextList = curList.filter(x => x !== targetId);
      } else {
        if (curList.length >= 6) {
          return res.status(400).json({ error: 'Maksimal 6 gift bisa dipasang sekaligus di kartu profil ya.' });
        }
        nextList = [...curList, targetId];
      }
      db.prepare('UPDATE users SET pinned_gift_id = ? WHERE id = ?')
        .run(nextList.length ? JSON.stringify(nextList) : '', uid);
    }
  } else {
    return res.status(400).json({ error: 'Tipe item tidak dikenali.' });
  }

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(uid);
  res.json({ user: attachExtraUserFields(updated) });
});

// POST /api/profile/birthday -> Simpan tanggal ulang tahun
userRouter.post('/profile/birthday', requireUser, (req, res) => {
  const bday = String(req.body?.birthday || '').trim();
  if (!/^\d{2}-\d{2}$/.test(bday)) {
    return res.status(400).json({ error: 'Format tanggal harus DD-MM ya.' });
  }
  db.prepare('UPDATE users SET birthday = ? WHERE id = ?').run(bday, req.dbUser.id);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.dbUser.id);
  res.json({ user: attachExtraUserFields(updated) });
});

// POST /api/presence & /api/profile/presence -> Update status nongkrong warga
function handlePresenceUpdate(req, res) {
  const raw = req.body?.presence || req.body?.status || req.body?.text || '';
  const cleaned = String(raw).replace(/undefined/gi, '').trim().slice(0, 32);
  const status = cleaned || '☕ Nongki Santai';

  db.prepare('UPDATE users SET presence = ?, presence_at = ? WHERE id = ?')
    .run(status, Date.now(), req.dbUser.id);

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.dbUser.id);
  res.json({ user: attachExtraUserFields(updated), onlineUsers: getOnlineUsers() });
}

userRouter.post('/presence', requireUser, handlePresenceUpdate);
userRouter.post('/profile/presence', requireUser, handlePresenceUpdate);

// GET /api/users/profile/:target -> Lihat profil publik warga lain (by ID atau @username)
userRouter.get('/users/profile/:target', (req, res) => {
  const raw = String(req.params.target || '').trim().replace(/^@+/, '');
  if (!raw) return res.status(400).json({ error: 'Target warga tidak valid.' });

  const row = db.prepare(`
    SELECT * FROM users WHERE id = ? OR LOWER(username) = LOWER(?) LIMIT 1
  `).get(raw, raw);

  if (!row) return res.status(404).json({ error: 'Warga tidak ditemukan.' });

  const itemCount = db.prepare('SELECT COUNT(*) AS c FROM inventory WHERE user_id = ?').get(row.id).c;
  const pubUser = attachExtraUserFields(row);
  delete pubUser.psc;

  res.json({
    user: pubUser,
    itemCount
  });
});
