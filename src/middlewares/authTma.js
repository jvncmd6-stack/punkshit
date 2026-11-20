import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { ENV } from '../config/env.js';
import { db } from '../database/db.js';
import { syncTelegramAvatar } from '../services/syncEngine.js';

// Pastikan subfolder banners tersedia untuk menyimpan cache foto profil Telegram
fs.mkdirSync(path.join(ENV.UPLOAD_DIR, 'banners'), { recursive: true });

const avatarSyncCooldown = new Map();

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
    if (ENV.OWNER_IDS.includes(uid) && user.role !== 'owner') {
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run('owner', uid);
      user.role = 'owner';
    }

    // Sinkronisasi PP & Username Telegram (tiap 5 menit) selama tidak memakai foto kustom
    const now = Date.now();
    const isCustomPhoto = (user.photo_url || '').startsWith('/uploads/') && !(user.photo_url || '').includes('/pfp-');
    if (!isCustomPhoto && (avatarSyncCooldown.get(uid) || 0) < now) {
      avatarSyncCooldown.set(uid, now + 5 * 60 * 1000);
      syncTelegramAvatar(uid, tgUser).catch(() => {});
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
