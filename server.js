import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { InlineKeyboard } from 'grammy';
import { ENV } from './src/config/env.js';
import { db, initDb } from './src/database/db.js';
import { authTma } from './src/middlewares/authTma.js';
import { userRouter } from './src/api/userRoutes.js';
import { actionRouter } from './src/api/actionRoutes.js';
import { socialExtraRouter } from './src/api/socialExtraRoutes.js';
import { gameRouter } from './src/api/gameRoutes.js';
import { socialRouter } from './src/api/socialRoutes.js';
import { kotakBirthdayRouter } from './src/api/kotakBirthdayRoutes.js';
import { sparkArenaRouter } from './src/api/sparkArenaRoutes.js';
import { escHtml, buildMiniAppUrl } from './src/services/syncEngine.js';
import * as botMod from './src/bot/index.js';

fs.mkdirSync(ENV.DATA_DIR, { recursive: true });
fs.mkdirSync(ENV.UPLOAD_DIR, { recursive: true });

initDb();

// Tabel Spark Buddies di database SQLite utama
db.exec(`
  CREATE TABLE IF NOT EXISTS spark_pairs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user1 TEXT NOT NULL,
    user2 TEXT NOT NULL,
    status TEXT NOT NULL,
    streak INTEGER DEFAULT 0,
    xp INTEGER DEFAULT 0,
    last_qualified_date TEXT DEFAULT '',
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

// Auto-Cleanup data kadaluarsa (Wanted > 24 jam, Arsip Menfess > 7 hari)
function cleanupExpiredSocialData() {
  try {
    const oneDayAgo = Date.now() - 24 * 3600 * 1000;
    const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;

    db.prepare('DELETE FROM wanted_joins WHERE wanted_id IN (SELECT id FROM wanted WHERE created_at < ?)').run(oneDayAgo);
    db.prepare('DELETE FROM wanted WHERE created_at < ?').run(oneDayAgo);

    db.prepare('DELETE FROM menfess_replies WHERE menfess_id IN (SELECT id FROM menfess WHERE created_at < ?)').run(sevenDaysAgo);
    db.prepare("DELETE FROM menfess WHERE status = 'approved' AND created_at < ?").run(sevenDaysAgo);
  } catch (err) {
    console.error('[Auto-Cleanup Error]:', err.message);
  }
}

cleanupExpiredSocialData();
setInterval(cleanupExpiredSocialData, 3 * 3600 * 1000);

const MAX_SPARK_SLOTS = 3;

function todayWib() {
  const now = new Date(Date.now() + 7 * 3600 * 1000);
  return now.toISOString().slice(0, 10);
}

function cleanUsn(v) {
  return String(v || '').trim().replace(/^@+/, '').toLowerCase();
}

export function getSparkListForUser(username) {
  const usn = cleanUsn(username);
  if (!usn) return [];

  const rows = db.prepare(`
    SELECT * FROM spark_pairs
    WHERE (user1 = ? OR user2 = ?) AND status IN ('pending', 'paired')
    ORDER BY id ASC
  `).all(usn, usn);

  const today = todayWib();
  const a1 = db.prepare('SELECT gap, msg FROM spark_daily WHERE date = ? AND username = ?').get(today, usn);
  const g1 = { gap: a1 ? a1.gap : 0, msg: a1 ? a1.msg : 0 };

  return rows.map((pair) => {
    if (pair.status === 'pending') {
      if (pair.user1 === usn) {
        return { status: 'outgoing', targetUsername: pair.user2 };
      }
      return { status: 'incoming', fromUsername: pair.user1 };
    }

    const partner = pair.user1 === usn ? pair.user2 : pair.user1;
    const a2 = db.prepare('SELECT gap, msg FROM spark_daily WHERE date = ? AND username = ?').get(today, partner);

    return {
      status: 'paired',
      partnerUsername: partner,
      streak: pair.streak || 0,
      xp: pair.xp || 0,
      g1,
      g2: { gap: a2 ? a2.gap : 0, msg: a2 ? a2.msg : 0 }
    };
  });
}

export function getSparkStateForUser(username) {
  const list = getSparkListForUser(username);
  return list.length ? list[0] : null;
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

// 1. Security Headers dasar
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// 2. Penguncian CORS sesuai domain Mini App
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

// 3. Anti-Spam Rate Limiter ringan (maks 90 req / menit per IP)
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

// 4. Anti-Spam Cooldown khusus aksi broadcast ke Grup/Channel
const socialCooldowns = new Map();
function socialBotCooldown(req, res, next) {
  if (req.method !== 'POST') return next();

  const rules = {
    '/social/greet': { sec: 45, label: 'Sapa warga' },
    '/radio': { sec: 90, label: 'Request lagu' },
    '/wanted': { sec: 120, label: 'Pasang Wanted Board' },
    '/menfess': { sec: 60, label: 'Kirim Menfess' }
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
app.use('/api', socialRouter);
app.use('/api', socialExtraRouter);
app.use('/api', kotakBirthdayRouter);
app.use('/api', sparkArenaRouter);

// === ENDPOINT SPARK BUDDIES (MAX 3 SLOTS) ===
app.get('/api/spark/status', (req, res) => {
  const authUser = req.tgUser || req.dbUser || req.user || {};
  const usn = cleanUsn(authUser.username || req.query.username);
  if (!usn) return res.json({ sparkBuddies: [], sparkBuddy: null });
  const list = getSparkListForUser(usn);
  res.json({
    sparkBuddies: list,
    sparkBuddy: list[0] || null
  });
});

app.post('/api/spark/action', async (req, res) => {
  try {
    const body = req.body || {};
    const action = body.type || '';
    const authUser = req.tgUser || req.dbUser || req.user || {};

    const verifiedUsn = cleanUsn(authUser.username);
    const actor = verifiedUsn || cleanUsn(body.byUsername || body.fromUsername);
    const target = (action === 'SPARK_INVITE_ACCEPT' || action === 'SPARK_INVITE_DECLINE')
      ? cleanUsn(body.fromUsername || body.targetUsername)
      : cleanUsn(body.targetUsername || body.fromUsername);

    if (!actor) {
      return res.status(400).json({ ok: false, message: 'Username Telegram kamu belum terbaca.' });
    }

    if (action === 'SPARK_INVITE_SEND') {
      if (!target || actor === target) {
        const list = getSparkListForUser(actor);
        return res.json({
          ok: false,
          message: 'Username target tidak valid.',
          sparkBuddies: list,
          sparkBuddy: list[0] || null
        });
      }

      const samePair = db.prepare(`
        SELECT 1 FROM spark_pairs
        WHERE ((user1 = ? AND user2 = ?) OR (user1 = ? AND user2 = ?))
          AND status IN ('pending', 'paired')
      `).get(actor, target, target, actor);

      if (samePair) {
        const list = getSparkListForUser(actor);
        return res.json({
          ok: false,
          message: `Kamu dan @${target} sudah terhubung atau sedang pending.`,
          sparkBuddies: list,
          sparkBuddy: list[0] || null
        });
      }

      const actorCount = db.prepare(`
        SELECT COUNT(*) AS cnt FROM spark_pairs
        WHERE (user1 = ? AND status IN ('pending', 'paired'))
           OR (user2 = ? AND status = 'paired')
      `).get(actor, actor).cnt;

      if (actorCount >= MAX_SPARK_SLOTS) {
        const list = getSparkListForUser(actor);
        return res.json({
          ok: false,
          message: `Slot kamu sudah penuh (maksimal ${MAX_SPARK_SLOTS} partner).`,
          sparkBuddies: list,
          sparkBuddy: list[0] || null
        });
      }

      const targetPairedCount = db.prepare(`
        SELECT COUNT(*) AS cnt FROM spark_pairs
        WHERE (user1 = ? OR user2 = ?) AND status = 'paired'
      `).get(target, target).cnt;

      if (targetPairedCount >= MAX_SPARK_SLOTS) {
        const list = getSparkListForUser(actor);
        return res.json({
          ok: false,
          message: `Slot partner @${target} sudah penuh (${MAX_SPARK_SLOTS}/${MAX_SPARK_SLOTS}).`,
          sparkBuddies: list,
          sparkBuddy: list[0] || null
        });
      }

      db.prepare(`
        INSERT INTO spark_pairs (user1, user2, status, streak, xp, last_qualified_date, created_at)
        VALUES (?, ?, 'pending', 0, 0, '', ?)
      `).run(actor, target, Date.now());

      const bot = typeof botMod.getBotInstance === 'function' ? botMod.getBotInstance() : null;
      if (bot) {
        const targetRow = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(target);
        const kb = new InlineKeyboard();
        const sparkUrl = buildMiniAppUrl('spark');
        if (sparkUrl) {
          kb.url('🔥 Buka Spark Buddies', sparkUrl).row();
        }
        kb.text('✅ ACC Ajakan', `spark_acc:${actor}:${target}`)
          .text('❌ Tolak', `spark_dec:${actor}:${target}`);

        const notifText =
          `🔥 <b>SPARK BUDDIES INVITE!</b>\n` +
          `@${escHtml(actor)} ngajak @${escHtml(target)} nyalain api bareng di markas.\n` +
          `Klik tombol di bawah atau ketik <code>/acc</code> buat setuju!`;

        let sentDm = false;
        if (targetRow && targetRow.id) {
          try {
            await bot.api.sendMessage(targetRow.id, notifText, { parse_mode: 'HTML', reply_markup: kb });
            sentDm = true;
          } catch (e) {
            sentDm = false;
          }
        }
        if (!sentDm && ENV.GROUP_ID) {
          await bot.api.sendMessage(ENV.GROUP_ID, notifText, { parse_mode: 'HTML', reply_markup: kb }).catch(() => {});
        }
      }

      const list = getSparkListForUser(actor);
      return res.json({
        ok: true,
        message: 'Ajakan terkirim!',
        sparkBuddies: list,
        sparkBuddy: list[0] || null
      });
    }

    if (action === 'SPARK_INVITE_ACCEPT') {
      const row = db.prepare(`
        SELECT id FROM spark_pairs WHERE user1 = ? AND user2 = ? AND status = 'pending'
      `).get(target, actor);

      if (!row) {
        const list = getSparkListForUser(actor);
        return res.json({
          ok: false,
          message: 'Ajakan tidak ditemukan.',
          sparkBuddies: list,
          sparkBuddy: list[0] || null
        });
      }

      const actorPairedCount = db.prepare(`
        SELECT COUNT(*) AS cnt FROM spark_pairs
        WHERE (user1 = ? OR user2 = ?) AND status = 'paired'
      `).get(actor, actor).cnt;

      if (actorPairedCount >= MAX_SPARK_SLOTS) {
        const list = getSparkListForUser(actor);
        return res.json({
          ok: false,
          message: `Slot aktif kamu sudah penuh (${MAX_SPARK_SLOTS}/${MAX_SPARK_SLOTS}). Putuskan 1 slot dulu.`,
          sparkBuddies: list,
          sparkBuddy: list[0] || null
        });
      }

      db.prepare("UPDATE spark_pairs SET status = 'paired' WHERE id = ?").run(row.id);
      const list = getSparkListForUser(actor);
      return res.json({
        ok: true,
        message: 'Spark resmi menyala!',
        sparkBuddies: list,
        sparkBuddy: list[0] || null
      });
    }

    if (['SPARK_INVITE_DECLINE', 'SPARK_INVITE_CANCEL', 'SPARK_UNPAIR'].includes(action)) {
      db.prepare(`
        DELETE FROM spark_pairs
        WHERE (user1 = ? AND user2 = ?) OR (user1 = ? AND user2 = ?)
      `).run(actor, target, target, actor);

      const list = getSparkListForUser(actor);
      return res.json({
        ok: true,
        message: 'Koneksi dihapus.',
        sparkBuddies: list,
        sparkBuddy: list[0] || null
      });
    }

    const list = getSparkListForUser(actor);
    return res.json({
      ok: false,
      message: 'Aksi tidak dikenal.',
      sparkBuddies: list,
      sparkBuddy: list[0] || null
    });
  } catch (err) {
    console.error('[Spark Action Error]:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

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
