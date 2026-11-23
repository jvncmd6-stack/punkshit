import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { ENV } from './src/config/env.js';
import { db, initDb } from './src/database/db.js';
import { authTma } from './src/middlewares/authTma.js';
import { userRouter } from './src/api/userRoutes.js';
import { actionRouter } from './src/api/actionRoutes.js';
import { socialExtraRouter } from './src/api/socialExtraRoutes.js';
import { gameRouter } from './src/api/gameRoutes.js';
import { socialRouter } from './src/api/socialRoutes.js';
import { marketRouter } from './src/api/marketRoutes.js';
import { kotakBirthdayRouter } from './src/api/kotakBirthdayRoutes.js';
import { sparkArenaRouter } from './src/api/sparkArenaRoutes.js';
import { sparkRouter } from './src/api/sparkRoutes.js';
import * as botMod from './src/bot/index.js';

fs.mkdirSync(ENV.DATA_DIR, { recursive: true });
fs.mkdirSync(ENV.UPLOAD_DIR, { recursive: true });

initDb();

// Tabel Spark Buddies & Keamanan Akun di database SQLite utama
db.exec(`
  CREATE TABLE IF NOT EXISTS spark_pairs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user1 TEXT NOT NULL,
    user2 TEXT NOT NULL,
    status TEXT NOT NULL,
    streak INTEGER DEFAULT 0,
    xp INTEGER DEFAULT 0,
    last_qualified_date TEXT DEFAULT '',
    case_status TEXT DEFAULT 'OPEN',
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS spark_daily (
    date TEXT NOT NULL,
    username TEXT NOT NULL,
    gap INTEGER DEFAULT 0,
    msg INTEGER DEFAULT 0,
    last_msg_ts INTEGER DEFAULT 0,
    PRIMARY KEY (date, username)
  );
`);

try { db.exec("ALTER TABLE spark_pairs ADD COLUMN case_status TEXT DEFAULT 'OPEN'"); } catch (_) {}
try { db.exec('ALTER TABLE users ADD COLUMN is_frozen INTEGER DEFAULT 0'); } catch (_) {}

// Auto-Cleanup data kadaluarsa + Reset Kasus Mingguan Spark tiap Senin WIB
function cleanupAndMaintenance() {
  try {
    const oneDayAgo = Date.now() - 24 * 3600 * 1000;
    const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;

    db.prepare('DELETE FROM wanted_joins WHERE wanted_id IN (SELECT id FROM wanted WHERE created_at < ?)').run(oneDayAgo);
    db.prepare('DELETE FROM wanted WHERE created_at < ?').run(oneDayAgo);

    db.prepare('DELETE FROM menfess_replies WHERE menfess_id IN (SELECT id FROM menfess WHERE created_at < ?)').run(sevenDaysAgo);
    db.prepare("DELETE FROM menfess WHERE status = 'approved' AND created_at < ?").run(sevenDaysAgo);

    // Buka kembali kasus mingguan Spark yang sudah selesai saat masuk hari Senin (WIB)
    const nowWib = new Date(Date.now() + 7 * 3600 * 1000);
    if (nowWib.getUTCDay() === 1) {
      db.prepare("UPDATE spark_pairs SET case_status = 'OPEN' WHERE case_status = 'COMPLETED'").run();
    }
  } catch (err) {
    console.error('[Maintenance Error]:', err.message);
  }
}

cleanupAndMaintenance();
setInterval(cleanupAndMaintenance, 3 * 3600 * 1000);

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

const rawCors = (process.env.CORS_ORIGINS || '').trim();
const allowedOrigins = [
  ...rawCors.split(','),
  ENV.WEBAPP_URL || '',
  'https://web.telegram.org'
].map(s => s.trim().replace(/\/+$/, '')).filter(s => s && s !== '*');

app.use(cors({
  origin(origin, cb) {
    if (!origin || rawCors === '*' || !allowedOrigins.length) return cb(null, true);
    const cleanOrigin = origin.replace(/\/+$/, '');
    if (
      allowedOrigins.includes(cleanOrigin) ||
      cleanOrigin.endsWith('.github.io') ||
      cleanOrigin.endsWith('.vercel.app')
    ) {
      return cb(null, true);
    }
    return cb(new Error('Origin tidak diizinkan oleh kebijakan CORS: ' + cleanOrigin));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-telegram-init-data']
}));

const rateBuckets = new Map();
function apiRateLimit(req, res, next) {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  let bucket = rateBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 1, resetAt: now + 60 * 1000 };
    rateBuckets.set(ip, bucket);
    return next();
  }
  bucket.count += 1;
  if (bucket.count > 90) {
    return res.status(429).json({ error: 'Terlalu banyak request, santai dulu bro!' });
  }
  next();
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, b] of rateBuckets.entries()) {
    if (now > b.resetAt) rateBuckets.delete(ip);
  }
}, 5 * 60 * 1000);

const socialCooldowns = new Map();
function socialBotCooldown(req, res, next) {
  if (req.method !== 'POST') return next();

  const rules = {
    '/social/greet': { sec: 45, label: 'Sapa warga' },
    '/radio': { sec: 90, label: 'Request lagu' },
    '/wanted': { sec: 120, label: 'Pasang Wanted Board' },
    '/menfess': { sec: 60, label: 'Kirim Menfess' },
    '/shop/collab-submit': { sec: 120, label: 'Ajukan Item Collab' }
  };

  const rule = rules[req.path];
  if (!rule) return next();

  const uid = String(req.tgUser?.id || req.dbUser?.id || req.ip || 'anon');
  const key = `${uid}:${req.path}`;
  const now = Date.now();
  const until = socialCooldowns.get(key) || 0;

  if (now < until) {
    const left = Math.ceil((until - now) / 1000);
    return res.status(429).json({
      error: `Sabar bro, tunggu ${left} detik lagi sebelum ${rule.label} ulang biar grup nggak banjir!`
    });
  }

  socialCooldowns.set(key, now + rule.sec * 1000);
  next();
}

app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static(ENV.UPLOAD_DIR));

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'PUNKSHIT.OS API', time: Date.now() });
});

app.use('/api', apiRateLimit);
app.use('/api', authTma);
app.use('/api', userRouter);
app.use('/api', actionRouter);
app.use('/api', gameRouter);
app.use('/api', socialBotCooldown);
app.use('/api', marketRouter);
app.use('/api', socialRouter);
app.use('/api', socialExtraRouter);
app.use('/api', kotakBirthdayRouter);
app.use('/api', sparkArenaRouter);
app.use('/api', sparkRouter);

if (fs.existsSync(path.resolve('./src/api/adminRoutes.js'))) {
  const adminMod = await import('./src/api/adminRoutes.js');
  const adminRouter = adminMod.adminRouter || adminMod.default;
  if (adminRouter) app.use('/api', adminRouter);
}

app.use((err, req, res, next) => {
  console.error('[API Error]:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = Number(process.env.PORT) || ENV.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[PUNKSHIT.OS] API berjalan di port ${PORT}`);
  const runBot = botMod.startBot || botMod.initBot || botMod.launchBot || botMod.default;
  if (typeof runBot === 'function') {
    runBot();
  }
});
