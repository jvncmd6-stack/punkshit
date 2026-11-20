import crypto from 'crypto';
import { ENV } from '../config/env.js';
import { db } from '../database/db.js';

// Cek kolom foto yang tersedia di tabel users (mendukung photo_url maupun avatar)
const userCols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
const hasPhotoUrlCol = userCols.includes('photo_url');
const hasAvatarCol = userCols.includes('avatar');
const hasUsernameCol = userCols.includes('username');

// Cache sementara agar fallback Bot API tidak dipanggil berulang kali tiap detik
const bgSyncCooldown = new Map();

async function syncTelegramPhotoFallback(uid) {
  if (!ENV.BOT_TOKEN) return;
  const now = Date.now();
  if ((bgSyncCooldown.get(uid) || 0) > now) return;
  bgSyncCooldown.set(uid, now + 5 * 60 * 1000); // Cooldown 5 menit per user

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${ENV.BOT_TOKEN}/getUserProfilePhotos?user_id=${encodeURIComponent(uid)}&limit=1`
    );
    const data = await res.json();
    const photos = data?.result?.photos;
    if (!photos || !photos.length || !photos[0].length) return;

    const bestPhoto = photos[0][photos[0].length - 1];
    const fileRes = await fetch(
      `https://api.telegram.org/bot${ENV.BOT_TOKEN}/getFile?file_id=${encodeURIComponent(bestPhoto.file_id)}`
    );
    const fileData = await fileRes.json();
    const filePath = fileData?.result?.file_path;
    if (!filePath) return;

    const tgFileUrl = `https://api.telegram.org/file/bot${ENV.BOT_TOKEN}/${filePath}`;
    if (hasPhotoUrlCol) {
      db.prepare('UPDATE users SET photo_url = ? WHERE id = ?').run(tgFileUrl, uid);
    }
    if (hasAvatarCol) {
      db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(tgFileUrl, uid);
    }
  } catch {
    // Abaikan jika user menyembunyikan foto profil di privasi Telegram
  }
}

export function verifyTelegramInitData(initData) {
  if (!initData) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(ENV.BOT_TOKEN)
    .digest();

  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (signature !== hash) return null;

  const authDate = Number(params.get('auth_date') || 0);
  if (Date.now() / 1000 - authDate > 86400) return null;

  try {
    return JSON.parse(params.get('user'));
  } catch {
    return null;
  }
}

// Middleware utama: membaca header `Authorization: tma <initData>` & sinkronisasi profil Telegram
export function authTma(req, res, next) {
  const raw = (req.get('authorization') || '').replace(/^tma\s+/i, '').trim();
  const tgUser = verifyTelegramInitData(raw);
  if (!tgUser || !tgUser.id) {
    return res.status(401).json({ error: 'Sesi Telegram tidak valid. Buka ulang dari bot.' });
  }

  req.tgUser = tgUser;
  const uid = String(tgUser.id);
  let user = db.prepare('SELECT * FROM users WHERE id = ?').get(uid);

  if (user) {
    // 1. Kunci role owner jika masuk daftar OWNER_IDS
    if (ENV.OWNER_IDS.includes(uid) && user.role !== 'owner') {
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run('owner', uid);
      user.role = 'owner';
    }

    // 2. Sinkronisasi username Telegram terbaru
    const latestUsername = tgUser.username || '';
    if (hasUsernameCol && latestUsername && user.username !== latestUsername) {
      db.prepare('UPDATE users SET username = ? WHERE id = ?').run(latestUsername, uid);
      user.username = latestUsername;
    }

    // 3. Sinkronisasi foto profil Telegram (kecuali user memakai foto kustom hasil upload '/uploads/')
    const currentPhoto = (hasPhotoUrlCol ? user.photo_url : user.avatar) || '';
    const isCustomUploaded = currentPhoto.startsWith('/uploads/');
    const latestTgPhoto = tgUser.photo_url || '';

    if (!isCustomUploaded) {
      if (latestTgPhoto && currentPhoto !== latestTgPhoto) {
        if (hasPhotoUrlCol) {
          db.prepare('UPDATE users SET photo_url = ? WHERE id = ?').run(latestTgPhoto, uid);
          user.photo_url = latestTgPhoto;
        }
        if (hasAvatarCol) {
          db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(latestTgPhoto, uid);
          user.avatar = latestTgPhoto;
        }
      } else if (!latestTgPhoto && !currentPhoto) {
        // Fallback ambil foto profil via Bot API di background jika initData tidak menyertakan photo_url
        syncTelegramPhotoFallback(uid);
      }
    }
  }

  req.dbUser = user || null;
  next();
}

export function requireUser(req, res, next) {
  if (!req.dbUser) {
    return res.status(403).json({ error: 'Akun PunkID belum terdaftar.' });
  }
  next();
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.dbUser || !allowedRoles.includes(req.dbUser.role)) {
      return res.status(403).json({ error: 'Akses ditolak. Khusus pengurus Ruang Dalang.' });
    }
    next();
  };
}
