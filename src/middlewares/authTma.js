import crypto from 'crypto';
import { ENV } from '../config/env.js';
import { db } from '../database/db.js';

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

// Middleware utama: membaca header `Authorization: tma <initData>`
export function authTma(req, res, next) {
  const raw = (req.get('authorization') || '').replace(/^tma\s+/i, '').trim();
  const tgUser = verifyTelegramInitData(raw);
  if (!tgUser || !tgUser.id) {
    return res.status(401).json({ error: 'Sesi Telegram tidak valid. Buka ulang dari bot.' });
  }

  req.tgUser = tgUser;
  const uid = String(tgUser.id);
  let user = db.prepare('SELECT * FROM users WHERE id = ?').get(uid);

  // Pastikan jika ID termasuk OWNER_IDS, role otomatis terkunci sebagai 'owner'
  if (user && ENV.OWNER_IDS.includes(uid) && user.role !== 'owner') {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run('owner', uid);
    user.role = 'owner';
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
