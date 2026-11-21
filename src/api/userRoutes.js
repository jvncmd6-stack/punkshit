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

// GET /api/me -> Sinkronisasi state awal + konfigurasi URL Grup/Channel
userRouter.get('/me', async (req, res) => {
  const uid = String(req.tgUser.id);
  let user = req.dbUser;

  if (user && !user.photo_url) {
    await syncTelegramAvatar(uid, req.tgUser);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(uid);
  }

  const inv = user
    ? db.prepare('SELECT id, item_id AS itemId, acquired_at AS acquiredAt FROM inventory WHERE user_id = ? ORDER BY id DESC').all(uid)
    : [];

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
    user: formatUser(user),
    inv,
    catalog: getCatalog(),
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
    return res.json({ user: formatUser(req.dbUser), inv: [] });
  }

  const uid = String(req.tgUser.id);
  const rawName = String(req.body?.name || req.tgUser.first_name || 'Warga').trim().slice(0, 24);
  if (rawName.length < 2) {
    return res.status(400).json({ error: 'Nama minimal 2 karakter.' });
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
    text: `🪪 <b>NEW CHARACTER UNLOCKED!</b>\n<b>${escHtml(rawName)}</b> (${memberNo}) resmi mencetak PunkID dan bergabung di markas. Good luck, rookie!`,
    buttonText: '🪪 LIHAT MARKAS',
    feedText: `NEW CHARACTER UNLOCKED! ${rawName} (${memberNo}) resmi jadi warga.`
  });

  res.json({ user: formatUser(freshUser), inv: [] });
});

// POST /api/profile/banner -> Upload gambar/GIF latar belakang profil
userRouter.post('/profile/banner', requireUser, uploadMem.single('banner'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File gambar banner belum dipilih.' });
    }
    const publicPath = await processAndSaveImage(req.file, 'banners', { width: 900, height: 450, fit: 'cover' });
    db.prepare('UPDATE users SET banner_url = ? WHERE id = ?').run(publicPath, req.dbUser.id);
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.dbUser.id);
    res.json({ user: formatUser(updated) });
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

  if (name.length < 2) return res.status(400).json({ error: 'Nama minimal 2 huruf.' });

  db.prepare(`
    UPDATE users SET name = ?, bio = ?, spotify_url = ?, ring_style = ? WHERE id = ?
  `).run(name, bio, spotifyUrl, ringStyle, req.dbUser.id);

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.dbUser.id);
  res.json({ user: formatUser(updated) });
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
  res.json({ user: formatUser(updated) });
});

// POST /api/profile/equip -> Pasang / lepas Border Avatar, Multi-Gift Profil (>1), atau Card Skin
userRouter.post('/profile/equip', requireUser, (req, res) => {
  const { type, itemId, itemIds } = req.body || {};
  const uid = req.dbUser.id;

  if (itemId) {
    const owned = db.prepare('SELECT 1 FROM inventory WHERE user_id = ? AND item_id = ?').get(uid, itemId);
    if (!owned) return res.status(403).json({ error: 'Item tidak ditemukan di Gudang Barang lo.' });
  }

  if (type === 'border') {
    db.prepare('UPDATE users SET equipped_border_id = ? WHERE id = ?').run(itemId || '', uid);
  } else if (type === 'skin') {
    db.prepare('UPDATE users SET equipped_skin_id = ? WHERE id = ?').run(itemId || '', uid);
  } else if (type === 'pin') {
    // Mendukung multi-gift (array itemIds) maupun toggle satuan (itemId) hingga 6 gift sekaligus
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
      // Kosongkan semua gift dari profil
      db.prepare('UPDATE users SET pinned_gift_id = ? WHERE id = ?').run('', uid);
    } else {
      const curList = parsePinnedGifts(req.dbUser.pinned_gift_id);
      const targetId = String(itemId).trim();
      let nextList;
      if (curList.includes(targetId)) {
        nextList = curList.filter(x => x !== targetId);
      } else {
        if (curList.length >= 6) {
          return res.status(400).json({ error: 'Maksimal 6 gift bisa dipasang sekaligus di profil.' });
        }
        nextList = [...curList, targetId];
      }
      db.prepare('UPDATE users SET pinned_gift_id = ? WHERE id = ?')
        .run(nextList.length ? JSON.stringify(nextList) : '', uid);
    }
  } else {
    return res.status(400).json({ error: 'Tipe equip tidak valid.' });
  }

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(uid);
  res.json({ user: formatUser(updated) });
});

// POST /api/profile/birthday -> Simpan tanggal ulang tahun
userRouter.post('/profile/birthday', requireUser, (req, res) => {
  const bday = String(req.body?.birthday || '').trim();
  if (!/^\d{2}-\d{2}$/.test(bday)) {
    return res.status(400).json({ error: 'Format tanggal harus DD-MM.' });
  }
  db.prepare('UPDATE users SET birthday = ? WHERE id = ?').run(bday, req.dbUser.id);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.dbUser.id);
  res.json({ user: formatUser(updated) });
});

// POST /api/presence -> Update status "Siapa yang Masih Hidup?" (anti undefined)
userRouter.post('/presence', requireUser, (req, res) => {
  const raw = req.body?.status || req.body?.text || '';
  const cleaned = String(raw).replace(/undefined/gi, '').trim().slice(0, 32);
  const status = cleaned || '☕ Nongki Dulu';

  db.prepare('UPDATE users SET presence = ?, presence_at = ? WHERE id = ?')
    .run(status, Date.now(), req.dbUser.id);

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.dbUser.id);
  res.json({ user: formatUser(updated), onlineUsers: getOnlineUsers() });
});

// GET /api/users/profile/:target -> Lihat profil publik warga lain (by ID atau @username)
userRouter.get('/users/profile/:target', (req, res) => {
  const raw = String(req.params.target || '').trim().replace(/^@+/, '');
  if (!raw) return res.status(400).json({ error: 'Target warga tidak valid.' });

  const row = db.prepare(`
    SELECT * FROM users WHERE id = ? OR LOWER(username) = LOWER(?) LIMIT 1
  `).get(raw, raw);

  if (!row) return res.status(404).json({ error: 'Warga tidak ditemukan.' });

  const itemCount = db.prepare('SELECT COUNT(*) AS c FROM inventory WHERE user_id = ?').get(row.id).c;
  const pubUser = formatUser(row);
  delete pubUser.psc; // Jangan tampilkan saldo privat orang lain

  res.json({
    user: pubUser,
    itemCount
  });
});
