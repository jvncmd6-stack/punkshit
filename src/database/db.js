import Database from 'better-sqlite3';
import { ENV } from '../config/env.js';

export const db = new Database(ENV.DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('busy_timeout = 5000');
db.pragma('foreign_keys = ON');

function safeAddColumn(table, colDef) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${colDef}`);
  } catch (_) {
    // Abaikan jika kolom sudah ada
  }
}

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT DEFAULT '',
      name TEXT NOT NULL,
      member_no TEXT NOT NULL,
      photo_url TEXT DEFAULT '',
      banner_url TEXT DEFAULT '',
      bio TEXT DEFAULT '',
      spotify_url TEXT DEFAULT '',
      birthday TEXT DEFAULT '',
      role TEXT DEFAULT 'member',
      psc INTEGER DEFAULT 110,
      streak INTEGER DEFAULT 0,
      best INTEGER DEFAULT 0,
      cred INTEGER DEFAULT 0,
      last_absen TEXT DEFAULT '',
      presence TEXT DEFAULT '☕ Nongki Dulu',
      presence_at INTEGER DEFAULT 0,
      ring_style INTEGER DEFAULT 1,
      equipped_border_id TEXT DEFAULT '',
      equipped_skin_id TEXT DEFAULT '',
      pinned_gift_id TEXT DEFAULT '',
      border_adj TEXT DEFAULT '',
      gift_adj TEXT DEFAULT '',
      fish_today INTEGER DEFAULT 0,
      fish_date TEXT DEFAULT '',
      fish_count INTEGER DEFAULT 0,
      scratched_date TEXT DEFAULT '',
      has_shared INTEGER DEFAULT 0,
      is_frozen INTEGER DEFAULT 0,
      extra_spark_slots INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      rarity TEXT DEFAULT 'Rare',
      stock INTEGER DEFAULT -1,
      desc TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      colors TEXT DEFAULT '',
      svg_path TEXT DEFAULT '',
      skin_class TEXT DEFAULT '',
      creator_id TEXT DEFAULT '',
      creator_name TEXT DEFAULT '',
      is_collab INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS item_submissions (
      id TEXT PRIMARY KEY,
      creator_id TEXT NOT NULL,
      creator_name TEXT NOT NULL,
      creator_username TEXT DEFAULT '',
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      desc TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      reviewed_by TEXT DEFAULT '',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS warga_shop_items (
      id TEXT PRIMARY KEY,
      seller_id TEXT NOT NULL,
      seller_name TEXT NOT NULL,
      seller_username TEXT DEFAULT '',
      category TEXT DEFAULT 'Barang',
      title TEXT NOT NULL,
      price INTEGER NOT NULL,
      stock INTEGER DEFAULT 1,
      sold_count INTEGER DEFAULT 0,
      description TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      status TEXT DEFAULT 'open',
      buyer_name TEXT DEFAULT '',
      boosted_until INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS warga_shop_orders (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      item_title TEXT NOT NULL,
      seller_id TEXT NOT NULL,
      seller_name TEXT NOT NULL,
      buyer_id TEXT NOT NULL,
      buyer_name TEXT NOT NULL,
      price INTEGER NOT NULL,
      note TEXT DEFAULT '',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      acquired_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      note TEXT DEFAULT '',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS saweran (
      id TEXT PRIMARY KEY,
      creator_id TEXT NOT NULL,
      creator_name TEXT NOT NULL,
      total_amount INTEGER NOT NULL,
      remaining_amount INTEGER NOT NULL,
      quota INTEGER NOT NULL,
      mode TEXT DEFAULT 'equal',
      message TEXT DEFAULT '',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS saweran_claims (
      saweran_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      claimed_at INTEGER NOT NULL,
      PRIMARY KEY (saweran_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS mission_claims (
      user_id TEXT NOT NULL,
      mission_id TEXT NOT NULL,
      period_key TEXT NOT NULL,
      claimed_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, mission_id, period_key)
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      type TEXT DEFAULT 'EVENT',
      title TEXT NOT NULL,
      date_text TEXT NOT NULL,
      description TEXT DEFAULT '',
      reward_text TEXT DEFAULT 'PSC & Street Cred',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS event_rsvps (
      event_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      joined_at INTEGER NOT NULL,
      PRIMARY KEY (event_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS wanted (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      category TEXT NOT NULL,
      slots INTEGER NOT NULL,
      note TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wanted_joins (
      wanted_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      joined_at INTEGER NOT NULL,
      PRIMARY KEY (wanted_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS menfess (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      category TEXT NOT NULL,
      text TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS polls (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      options_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS poll_votes (
      poll_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      option_index INTEGER NOT NULL,
      PRIMARY KEY (poll_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS capsules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      unlock_date TEXT NOT NULL,
      message TEXT NOT NULL,
      opened INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS feed (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_id TEXT NOT NULL,
      action TEXT NOT NULL,
      detail TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  // Migrasi aman untuk database lama agar kolom baru otomatis tersedia
  safeAddColumn('users', 'is_frozen INTEGER DEFAULT 0');
  safeAddColumn('users', 'extra_spark_slots INTEGER DEFAULT 0');
  safeAddColumn('users', "border_adj TEXT DEFAULT ''");
  safeAddColumn('users', "gift_adj TEXT DEFAULT ''");
  safeAddColumn('items', "creator_id TEXT DEFAULT ''");
  safeAddColumn('items', "creator_name TEXT DEFAULT ''");
  safeAddColumn('items', 'is_collab INTEGER DEFAULT 0');
  safeAddColumn('warga_shop_items', 'stock INTEGER DEFAULT 1');
  safeAddColumn('warga_shop_items', 'sold_count INTEGER DEFAULT 0');
  safeAddColumn('warga_shop_items', 'boosted_until INTEGER DEFAULT 0');

  const ins = db.prepare(`
    INSERT OR IGNORE INTO items (id, type, name, price, rarity, stock, desc, colors, svg_path, skin_class, created_at)
    VALUES (@id, @type, @name, @price, @rarity, -1, @desc, @colors, @svg_path, @skin_class, @created_at)
  `);
  const now = Date.now();
  const ringSvg = 'M50 4a46 46 0 100 92 46 46 0 000-92zm0 13a33 33 0 110 66 33 33 0 010-66z';

  const defaults = [
    { id: 'heart', type: 'gift', name: 'Chrome Heart', price: 50, rarity: 'Rare', desc: 'Hati krom buat yang spesial.', colors: JSON.stringify(['#cfeaff', '#176BFF']), svg_path: 'M50 88C18 64 8 46 8 33a21 21 0 0142-5 21 21 0 0142 5c0 13-10 31-42 55z', skin_class: '', created_at: now },
    { id: 'bolt', type: 'gift', name: 'Neon Bolt', price: 80, rarity: 'Rare', desc: 'Kilat buat yang selalu on fire.', colors: JSON.stringify(['#fff7a0', '#ffb800']), svg_path: 'M60 4L18 56h27l-7 40 44-56H55z', skin_class: '', created_at: now },
    { id: 'star', type: 'gift', name: 'Punk Star', price: 120, rarity: 'Epic', desc: 'Bintang jalanan, bersinar di gang.', colors: JSON.stringify(['#ffb3e6', '#9a3cff']), svg_path: 'M50 6l13 28 30 3-22 21 7 30-28-16-28 16 7-30L7 37l30-3z', skin_class: '', created_at: now },
    { id: 'fish', type: 'gift', name: 'Golden Punkfish', price: 300, rarity: 'Legendary', desc: 'Ikan emas langka. Main character luck.', colors: JSON.stringify(['#fff3b0', '#e09a00']), svg_path: 'M5 50C22 22 52 20 70 43l23-19v52L70 57C52 80 22 78 5 50z', skin_class: '', created_at: now },
    { id: 'crown', type: 'gift', name: 'Fosil Crown', price: 500, rarity: 'Legendary', desc: 'Mahkota buat fosil sejati markas.', colors: JSON.stringify(['#c8f7ff', '#1e8ab8']), svg_path: 'M8 80V28l24 24 18-34 18 34 24-24v52z', skin_class: '', created_at: now },
    { id: 'border-cyber', type: 'border', name: 'Cyber Blue Aura', price: 120, rarity: 'Rare', desc: 'Bingkai neon biru elektrik menyala di sekitar avatar.', colors: JSON.stringify(['#8FC7FF', '#176BFF']), svg_path: ringSvg, skin_class: 'border-cyber', created_at: now },
    { id: 'border-toxic', type: 'border', name: 'Toxic Slime Ring', price: 160, rarity: 'Rare', desc: 'Aura hijau radioaktif khas anak malam markas.', colors: JSON.stringify(['#9effa9', '#16a34a']), svg_path: ringSvg, skin_class: 'border-toxic', created_at: now },
    { id: 'border-crimson', type: 'border', name: 'Crimson Inferno', price: 220, rarity: 'Epic', desc: 'Cincin bara merah menyala buat yang lagi on fire.', colors: JSON.stringify(['#ff9e9e', '#dc2626']), svg_path: ringSvg, skin_class: 'border-crimson', created_at: now },
    { id: 'border-violet', type: 'border', name: 'Phantom Violet', price: 280, rarity: 'Epic', desc: 'Bingkai ungu mistis berputar untuk karakter misterius.', colors: JSON.stringify(['#e5b8ff', '#7c3aed']), svg_path: ringSvg, skin_class: 'border-violet', created_at: now },
    { id: 'border-gold', type: 'border', name: 'Solar Gold Halo', price: 420, rarity: 'Legendary', desc: 'Halo emas sultan dengan kilau mewah di foto profil.', colors: JSON.stringify(['#fff3a0', '#eab308']), svg_path: ringSvg, skin_class: 'border-gold', created_at: now },
    { id: 'skin-obsidian', type: 'skin', name: 'Midnight Obsidian Card', price: 150, rarity: 'Rare', desc: 'Lapisan hitam matte elegan dengan aksen karbon.', colors: JSON.stringify(['#475569', '#090d16']), svg_path: 'M15 25h70v50H15z', skin_class: 'skin-obsidian', created_at: now },
    { id: 'skin-chrome', type: 'skin', name: 'Chrome Edition Card', price: 200, rarity: 'Epic', desc: 'Lapisan metalik krom untuk kartu PunkID.', colors: JSON.stringify(['#e0e8f5', '#6c7a96']), svg_path: 'M15 25h70v50H15z', skin_class: 'skin-chrome', created_at: now },
    { id: 'skin-neon', type: 'skin', name: 'Cyber Neon Card', price: 260, rarity: 'Epic', desc: 'Kartu cyberpunk gradasi biru-ungu bercahaya.', colors: JSON.stringify(['#38bdf8', '#7e22ce']), svg_path: 'M15 25h70v50H15z', skin_class: 'skin-neon', created_at: now },
    { id: 'skin-crimson', type: 'skin', name: 'Blood Crimson Card', price: 320, rarity: 'Epic', desc: 'Kartu merah gelap berkarisma khusus pentolan gang.', colors: JSON.stringify(['#f87171', '#7f1d1d']), svg_path: 'M15 25h70v50H15z', skin_class: 'skin-crimson', created_at: now },
    { id: 'skin-gold', type: 'skin', name: 'Sultan Gold Card', price: 450, rarity: 'Legendary', desc: 'Kartu emas khusus donatur & sepuh markas.', colors: JSON.stringify(['#ffe879', '#b87b00']), svg_path: 'M15 25h70v50H15z', skin_class: 'skin-gold', created_at: now }
  ];

  const tx = db.transaction(list => { for (const item of list) ins.run(item); });
  tx(defaults);
}

export function addFeed(text) {
  db.prepare('INSERT INTO feed (text, created_at) VALUES (?, ?)').run(text, Date.now());
  db.prepare('DELETE FROM feed WHERE id NOT IN (SELECT id FROM feed ORDER BY id DESC LIMIT 20)').run();
}

export function addAuditLog(actorId, action, detail) {
  db.prepare('INSERT INTO audit_logs (actor_id, action, detail, created_at) VALUES (?, ?, ?, ?)')
    .run(String(actorId), action, detail, Date.now());
}
```[cite: 34]

---

### 📦 File 2: `server.js`
```javascript
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { InputFile } from 'grammy';
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

// ============================================================
// TAMENG ANTI-CRASH GLOBAL (Mencegah server mati mendadak)
// ============================================================
process.on('uncaughtException', (err) => {
  console.error('[Anti-Crash UncaughtException]:', err?.stack || err?.message || err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Anti-Crash UnhandledRejection]:', reason);
});

fs.mkdirSync(ENV.DATA_DIR, { recursive: true });
fs.mkdirSync(ENV.UPLOAD_DIR, { recursive: true });

initDb();

// Tabel Spark Buddies, Keamanan Akun & Pengaturan Bot
db.exec(`
  CREATE TABLE IF NOT EXISTS bot_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
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

// Auto-Backup Mingguan ke PC Owner setiap Minggu dini hari (WIB)
async function runWeeklyAutoBackup(nowWib) {
  try {
    const ownerIds = (ENV.OWNER_IDS || []).map(String).filter(Boolean);
    const bot = typeof botMod.getBotInstance === 'function' ? botMod.getBotInstance() : null;
    if (!ownerIds.length || !bot) return;

    // Hari Minggu (0) antara jam 02:00 - 04:59 WIB
    if (nowWib.getUTCDay() !== 0) return;
    const hourWib = nowWib.getUTCHours();
    if (hourWib < 2 || hourWib > 4) return;

    const todayStr = nowWib.toISOString().slice(0, 10);
    const key = `auto_backup_${todayStr}`;
    const done = db.prepare('SELECT value FROM bot_settings WHERE key = ?').get(key);
    if (done) return;

    db.prepare('INSERT OR REPLACE INTO bot_settings (key, value) VALUES (?, ?)').run(key, '1');
    try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch (_) {}

    const tmpFile = `/tmp/punkshit_autobackup_${todayStr}.tar.gz`;
    execSync(`tar -czf "${tmpFile}" -C "${ENV.DATA_DIR}" .`);

    const caption =
      `🛡️ <b>AUTO-BACKUP MINGGUAN PUNKSHIT.OS</b>\n` +
      `Tanggal: <code>${todayStr}</code>\n` +
      `Simpan file ini baik-baik sebagai cadangan penuh database & aset upload.`;

    await bot.api.sendDocument(ownerIds[0], new InputFile(tmpFile, `punkshit_backup_${todayStr}.tar.gz`), {
      caption,
      parse_mode: 'HTML'
    });

    try { fs.unlinkSync(tmpFile); } catch (_) {}
    console.log(`[Auto-Backup] Backup mingguan ${todayStr} berhasil dikirim ke Owner.`);
  } catch (err) {
    console.error('[Auto-Backup Error]:', err.message);
  }
}

// Auto-Cleanup data kadaluarsa + Reset Kasus Mingguan Spark tiap Senin WIB
function cleanupAndMaintenance() {
  try {
    const oneDayAgo = Date.now() - 24 * 3600 * 1000;
    const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;

    db.prepare('DELETE FROM wanted_joins WHERE wanted_id IN (SELECT id FROM wanted WHERE created_at < ?)').run(oneDayAgo);
    db.prepare('DELETE FROM wanted WHERE created_at < ?').run(oneDayAgo);

    db.prepare('DELETE FROM menfess_replies WHERE menfess_id IN (SELECT id FROM menfess WHERE created_at < ?)').run(sevenDaysAgo);
    db.prepare("DELETE FROM menfess WHERE status = 'approved' AND created_at < ?").run(sevenDaysAgo);

    const nowWib = new Date(Date.now() + 7 * 3600 * 1000);
    if (nowWib.getUTCDay() === 1) {
      db.prepare("UPDATE spark_pairs SET case_status = 'OPEN' WHERE case_status = 'COMPLETED'").run();
    }

    runWeeklyAutoBackup(nowWib);
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
