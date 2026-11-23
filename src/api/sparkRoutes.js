import { Router } from 'express';
import { InlineKeyboard } from 'grammy';
import { ENV } from '../config/env.js';
import { db } from '../database/db.js';
import { escHtml, buildMiniAppUrl } from '../services/syncEngine.js';
import * as botMod from '../bot/index.js';

export const sparkRouter = Router();

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
      if (pair.user1 === usn) return { status: 'outgoing', targetUsername: pair.user2 };
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

sparkRouter.get('/spark/status', (req, res) => {
  const authUser = req.tgUser || req.dbUser || req.user || {};
  const usn = cleanUsn(authUser.username || req.query.username);
  if (!usn) return res.json({ sparkBuddies: [], sparkBuddy: null });
  const list = getSparkListForUser(usn);
  res.json({ sparkBuddies: list, sparkBuddy: list[0] || null });
});

sparkRouter.post('/spark/action', async (req, res) => {
  try {
    const body = req.body || {};
    const action = body.type || '';
    const authUser = req.tgUser || req.dbUser || req.user || {};

    const verifiedUsn = cleanUsn(authUser.username);
    const actor = verifiedUsn || cleanUsn(body.byUsername || body.fromUsername);
    const target = (action === 'SPARK_INVITE_ACCEPT' || action === 'SPARK_INVITE_DECLINE')
      ? cleanUsn(body.fromUsername || body.targetUsername)
      : cleanUsn(body.targetUsername || body.fromUsername);

    if (!actor) return res.status(400).json({ ok: false, message: 'Username Telegram kamu belum terbaca.' });

    if (action === 'SPARK_INVITE_SEND') {
      if (!target || actor === target) {
        const list = getSparkListForUser(actor);
        return res.json({ ok: false, message: 'Username target tidak valid.', sparkBuddies: list, sparkBuddy: list[0] || null });
      }

      const samePair = db.prepare(`
        SELECT 1 FROM spark_pairs
        WHERE ((user1 = ? AND user2 = ?) OR (user1 = ? AND user2 = ?))
          AND status IN ('pending', 'paired')
      `).get(actor, target, target, actor);

      if (samePair) {
        const list = getSparkListForUser(actor);
        return res.json({ ok: false, message: `Kamu dan @${target} sudah terhubung atau sedang pending.`, sparkBuddies: list, sparkBuddy: list[0] || null });
      }

      const actorCount = db.prepare(`
        SELECT COUNT(*) AS cnt FROM spark_pairs
        WHERE (user1 = ? AND status IN ('pending', 'paired')) OR (user2 = ? AND status = 'paired')
      `).get(actor, actor).cnt;

      if (actorCount >= MAX_SPARK_SLOTS) {
        const list = getSparkListForUser(actor);
        return res.json({ ok: false, message: `Slot kamu sudah penuh (maksimal ${MAX_SPARK_SLOTS} partner).`, sparkBuddies: list, sparkBuddy: list[0] || null });
      }

      const targetPairedCount = db.prepare(`
        SELECT COUNT(*) AS cnt FROM spark_pairs WHERE (user1 = ? OR user2 = ?) AND status = 'paired'
      `).get(target, target).cnt;

      if (targetPairedCount >= MAX_SPARK_SLOTS) {
        const list = getSparkListForUser(actor);
        return res.json({ ok: false, message: `Slot partner @${target} sudah penuh (${MAX_SPARK_SLOTS}/${MAX_SPARK_SLOTS}).`, sparkBuddies: list, sparkBuddy: list[0] || null });
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
        if (sparkUrl) kb.url('🔥 Buka Spark Buddies', sparkUrl).row();
        kb.text('✅ ACC Ajakan', `spark_acc:${actor}:${target}`).text('❌ Tolak', `spark_dec:${actor}:${target}`);

        const notifText =
          `🔥 <b>SPARK BUDDIES INVITE!</b>\n` +
          `@${escHtml(actor)} ngajak @${escHtml(target)} nyalain api bareng di markas.\n` +
          `Klik tombol di bawah atau ketik <code>/acc</code> buat setuju!`;

        let sentDm = false;
        if (targetRow && targetRow.id) {
          try {
            await bot.api.sendMessage(targetRow.id, notifText, { parse_mode: 'HTML', reply_markup: kb });
            sentDm = true;
          } catch (e) { sentDm = false; }
        }
        if (!sentDm && ENV.GROUP_ID) {
          await bot.api.sendMessage(ENV.GROUP_ID, notifText, { parse_mode: 'HTML', reply_markup: kb }).catch(() => {});
        }
      }

      const list = getSparkListForUser(actor);
      return res.json({ ok: true, message: 'Ajakan terkirim!', sparkBuddies: list, sparkBuddy: list[0] || null });
    }

    if (action === 'SPARK_INVITE_ACCEPT') {
      const row = db.prepare("SELECT id FROM spark_pairs WHERE user1 = ? AND user2 = ? AND status = 'pending'").get(target, actor);
      if (!row) {
        const list = getSparkListForUser(actor);
        return res.json({ ok: false, message: 'Ajakan tidak ditemukan.', sparkBuddies: list, sparkBuddy: list[0] || null });
      }

      const actorPairedCount = db.prepare("SELECT COUNT(*) AS cnt FROM spark_pairs WHERE (user1 = ? OR user2 = ?) AND status = 'paired'").get(actor, actor).cnt;
      if (actorPairedCount >= MAX_SPARK_SLOTS) {
        const list = getSparkListForUser(actor);
        return res.json({ ok: false, message: `Slot aktif kamu sudah penuh (${MAX_SPARK_SLOTS}/${MAX_SPARK_SLOTS}). Putuskan 1 slot dulu.`, sparkBuddies: list, sparkBuddy: list[0] || null });
      }

      db.prepare("UPDATE spark_pairs SET status = 'paired' WHERE id = ?").run(row.id);
      const list = getSparkListForUser(actor);
      return res.json({ ok: true, message: 'Spark resmi menyala!', sparkBuddies: list, sparkBuddy: list[0] || null });
    }

    if (['SPARK_INVITE_DECLINE', 'SPARK_INVITE_CANCEL', 'SPARK_UNPAIR'].includes(action)) {
      db.prepare('DELETE FROM spark_pairs WHERE (user1 = ? AND user2 = ?) OR (user1 = ? AND user2 = ?)').run(actor, target, target, actor);
      const list = getSparkListForUser(actor);
      return res.json({ ok: true, message: 'Koneksi dihapus.', sparkBuddies: list, sparkBuddy: list[0] || null });
    }

    const list = getSparkListForUser(actor);
    return res.json({ ok: false, message: 'Aksi tidak dikenal.', sparkBuddies: list, sparkBuddy: list[0] || null });
  } catch (err) {
    console.error('[Spark Action Error]:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});
