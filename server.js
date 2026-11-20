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
import { gameRouter } from './src/api/gameRoutes.js';
import { socialRouter } from './src/api/socialRoutes.js';
import { escHtml } from './src/services/syncEngine.js';
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

function todayWib() {
  const now = new Date(Date.now() + 7 * 3600 * 1000);
  return now.toISOString().slice(0, 10);
}

function cleanUsn(v) {
  return String(v || '').trim().replace(/^@+/, '').toLowerCase();
}

export function getSparkStateForUser(username) {
  const usn = cleanUsn(username);
  if (!usn) return null;

  const pair = db.prepare(`
    SELECT * FROM spark_pairs
    WHERE (user1 = ? OR user2 = ?) AND status IN ('pending', 'paired')
    ORDER BY id DESC LIMIT 1
  `).get(usn, usn);

  if (!pair) return null;

  if (pair.status === 'pending') {
    if (pair.user1 === usn) {
      return { status: 'outgoing', targetUsername: pair.user2 };
    }
    return { status: 'incoming', fromUsername: pair.user1 };
  }

  const partner = pair.user1 === usn ? pair.user2 : pair.user1;
  const today = todayWib();
  const a1 = db.prepare('SELECT gap, msg FROM spark_daily WHERE date = ? AND username = ?').get(today, usn);
  const a2 = db.prepare('SELECT gap, msg FROM spark_daily WHERE date = ? AND username = ?').get(today, partner);

  return {
    status: 'paired',
    partnerUsername: partner,
    streak: pair.streak || 0,
    xp: pair.xp || 0,
    g1: { gap: a1 ? a1.gap : 0, msg: a1 ? a1.msg : 0 },
    g2: { gap: a2 ? a2.gap : 0, msg: a2 ? a2.msg : 0 }
  };
}

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static(ENV.UPLOAD_DIR));

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'PUNKSHIT.OS API', time: Date.now() });
});

app.use('/api', authTma);
app.use('/api', userRouter);
app.use('/api', actionRouter);
app.use('/api', gameRouter);
app.use('/api', socialRouter);

// === ENDPOINT SPARK BUDDIES ===
app.get('/api/spark/status', (req, res) => {
  const authUser = req.user || req.tgUser || res.locals?.user || {};
  const usn = cleanUsn(authUser.username || req.query.username);
  if (!usn) return res.json({ sparkBuddy: null });
  res.json({ sparkBuddy: getSparkStateForUser(usn) });
});

app.post('/api/spark/action', async (req, res) => {
  try {
    const body = req.body || {};
    const action = body.type || '';
    const authUser = req.user || req.tgUser || res.locals?.user || {};

    const actor = cleanUsn(authUser.username || body.byUsername || body.fromUsername);
    const target = (action === 'SPARK_INVITE_ACCEPT' || action === 'SPARK_INVITE_DECLINE')
      ? cleanUsn(body.fromUsername || body.targetUsername)
      : cleanUsn(body.targetUsername || body.fromUsername);

    if (!actor) {
      return res.status(400).json({ ok: false, message: 'Username Telegram kamu belum terbaca.' });
    }

    if (action === 'SPARK_INVITE_SEND') {
      if (!target || actor === target) {
        return res.json({ ok: false, message: 'Username target tidak valid.', sparkBuddy: getSparkStateForUser(actor) });
      }

      const existing = db.prepare(`
        SELECT 1 FROM spark_pairs
        WHERE (user1 IN (?, ?) OR user2 IN (?, ?)) AND status IN ('pending', 'paired')
      `).get(actor, target, actor, target);

      if (existing) {
        return res.json({
          ok: false,
          message: 'Salah satu sudah punya koneksi atau ajakan aktif.',
          sparkBuddy: getSparkStateForUser(actor)
        });
      }

      db.prepare(`
        INSERT INTO spark_pairs (user1, user2, status, streak, xp, last_qualified_date, created_at)
        VALUES (?, ?, 'pending', 0, 0, '', ?)
      `).run(actor, target, Date.now());

      // Kirim notifikasi lewat bot Mas Raka (Grammy)
      const bot = typeof botMod.getBotInstance === 'function' ? botMod.getBotInstance() : null;
      if (bot) {
        const targetRow = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(target);
        const kb = new InlineKeyboard();
        if (ENV.MINIAPP_LINK) {
          kb.url('🔥 Buka Spark Buddies', `${ENV.MINIAPP_LINK}?startapp=spark`).row();
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

      return res.json({ ok: true, message: 'Ajakan terkirim!', sparkBuddy: getSparkStateForUser(actor) });
    }

    if (action === 'SPARK_INVITE_ACCEPT') {
      const row = db.prepare(`
        SELECT id FROM spark_pairs WHERE user1 = ? AND user2 = ? AND status = 'pending'
      `).get(target, actor);

      if (!row) {
        return res.json({ ok: false, message: 'Ajakan tidak ditemukan.', sparkBuddy: getSparkStateForUser(actor) });
      }

      db.prepare("UPDATE spark_pairs SET status = 'paired' WHERE id = ?").run(row.id);
      return res.json({ ok: true, message: 'Spark resmi menyala!', sparkBuddy: getSparkStateForUser(actor) });
    }

    if (['SPARK_INVITE_DECLINE', 'SPARK_INVITE_CANCEL', 'SPARK_UNPAIR'].includes(action)) {
      db.prepare(`
        DELETE FROM spark_pairs
        WHERE (user1 = ? AND user2 = ?) OR (user1 = ? AND user2 = ?)
      `).run(actor, target, target, actor);

      return res.json({ ok: true, message: 'Koneksi dihapus.', sparkBuddy: null });
    }

    return res.json({ ok: false, message: 'Aksi tidak dikenal.', sparkBuddy: getSparkStateForUser(actor) });
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
