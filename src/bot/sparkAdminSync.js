import { InlineKeyboard } from 'grammy';
import { ENV } from '../config/env.js';
import { db } from '../database/db.js';
import { escHtml, buildMiniAppUrl } from '../services/syncEngine.js';

function todayWib() {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

function currentHourWib() {
  return new Date(Date.now() + 7 * 3600 * 1000).getUTCHours();
}

function cleanUsn(v) {
  return String(v || '').trim().replace(/^@+/, '').toLowerCase();
}

function isOwnerId(uid) {
  const owners = (ENV.OWNER_IDS || []).map(String);
  return Boolean(uid && owners.includes(String(uid)));
}

export function registerSparkAdminSync(bot) {
  // 1. Command /setor (Sinkron 100% dengan tombol Setor di WebApp + Bonus Mingguan +50 PSC)
  bot.command('setor', async (ctx) => {
    const usn = cleanUsn(ctx.from?.username);
    if (!usn) {
      return ctx.reply('Pasang @username Telegram dulu ya cuy biar Spark Buddies lo kebaca!');
    }

    const pairs = db.prepare(`
      SELECT * FROM spark_pairs
      WHERE (user1 = ? OR user2 = ?) AND status = 'paired'
      ORDER BY id ASC
    `).all(usn, usn);

    if (!pairs.length) {
      return ctx.reply('Lo belum punya pasangan Spark aktif cuy. Buka Spark Buddies buat ngajak partner dulu!');
    }

    const activeOpenPairs = pairs.filter((p) => String(p.case_status || 'OPEN').toUpperCase() !== 'COMPLETED');
    if (!activeOpenPairs.length) {
      return ctx.reply('🏁 Kasus Spark mingguan lo udah selesai semua cuy! Tombol & perintah setor dikunci sampai Senin depan.');
    }

    const today = todayWib();
    const existing = db.prepare('SELECT gap, msg FROM spark_daily WHERE date = ? AND username = ?').get(today, usn);
    if (existing && (existing.gap > 0 || existing.msg > 0)) {
      return ctx.reply('✅ Lo udah setor hari ini cuy! Setoran harian udah dikunci, lanjut besok lagi ya 🔥');
    }

    db.prepare(`
      INSERT INTO spark_daily (date, username, gap, msg)
      VALUES (?, ?, 1, 1)
      ON CONFLICT(date, username) DO UPDATE SET gap = MAX(1, gap), msg = MAX(1, msg)
    `).run(today, usn);

    const summaries = [];
    for (const pair of activeOpenPairs) {
      const partner = pair.user1 === usn ? pair.user2 : pair.user1;
      const pDaily = db.prepare('SELECT gap, msg FROM spark_daily WHERE date = ? AND username = ?').get(today, partner);
      const partnerDone = pDaily && (pDaily.gap > 0 || pDaily.msg > 0);

      if (partnerDone && pair.last_qualified_date !== today) {
        const newStreak = (pair.streak || 0) + 1;
        const hitWeeklyMilestone = newStreak > 0 && newStreak % 7 === 0;

        db.prepare(`
          UPDATE spark_pairs
          SET streak = ?,
              xp = COALESCE(xp, 0) + ?,
              last_qualified_date = ?,
              case_status = ?
          WHERE id = ?
        `).run(newStreak, hitWeeklyMilestone ? 75 : 25, today, hitWeeklyMilestone ? 'COMPLETED' : 'OPEN', pair.id);

        if (hitWeeklyMilestone) {
          db.prepare('UPDATE users SET psc = psc + 50, cred = cred + 10 WHERE LOWER(username) IN (?, ?)').run(pair.user1, pair.user2);
          summaries.push(
            `• Bareng <b>@${escHtml(partner)}</b>: 🏁 <b>KASUS MINGGUAN SELESAI (${newStreak} Hari)!</b> Masing-masing dapat bonus <b>+50 PSC & +10 Cred</b>!`
          );
        } else {
          summaries.push(`• Bareng <b>@${escHtml(partner)}</b>: 🔥 Api menyala penuh! (Streak ${newStreak} hari)`);
        }
      } else {
        db.prepare('UPDATE spark_pairs SET xp = COALESCE(xp, 0) + 10 WHERE id = ?').run(pair.id);
        summaries.push(`• Bareng <b>@${escHtml(partner)}</b>: ⏳ Setoran lo masuk, nunggu @${escHtml(partner)} setor.`);
      }
    }

    const kb = new InlineKeyboard();
    const sparkUrl = buildMiniAppUrl('spark');
    if (sparkUrl) kb.url('🔥 Cek Panggung Spark', sparkUrl);

    return ctx.reply(
      `🔥 <b>SETORAN SPARK BERHASIL!</b>\n\n${summaries.join('\n')}\n\n<i>Status hari ini terkunci otomatis di Bot & WebApp.</i>`,
      { parse_mode: 'HTML', reply_markup: sparkUrl ? kb : undefined }
    );
  });

  // 2. Callback ACC / Tolak Pengajuan PSC Khusus Owner langsung dari Bot
  bot.callbackQuery(/^psc_(acc|rej):([a-zA-Z0-9_-]+)$/, async (ctx) => {
    if (!isOwnerId(ctx.from?.id)) {
      return ctx.answerCallbackQuery({ text: 'Khusus Owner Markas ya cuy!', show_alert: true });
    }

    const decision = ctx.match[1];
    const reqId = ctx.match[2];
    const item = db.prepare("SELECT * FROM psc_requests WHERE id = ? AND status = 'pending'").get(reqId);

    if (!item) {
      await ctx.answerCallbackQuery({ text: 'Pengajuan ini sudah diproses sebelumnya.' });
      return ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
    }

    if (decision === 'acc') {
      db.prepare('UPDATE users SET psc = MAX(0, psc + ?) WHERE id = ?').run(item.amount, item.target_id);
      db.prepare("UPDATE psc_requests SET status = 'approved' WHERE id = ?").run(reqId);
      db.prepare('INSERT INTO audit_logs (actor_id, action, detail, created_at) VALUES (?, ?, ?, ?)')
        .run(String(ctx.from.id), 'IZIN PSC BOT', `+${item.amount} PSC ke ${item.target_name} (ajuan ${item.requester_name})`, Date.now());

      await ctx.answerCallbackQuery({ text: 'Izin diberikan! Saldo cair.' });
      return ctx.editMessageText(
        `✅ <b>IZIN CAIR DISETUJUI OWNER</b>\nPenerima: <b>${escHtml(item.target_name)}</b> (+${item.amount} PSC)\nDiajukan: ${escHtml(item.requester_name)}\nAlasan: <i>${escHtml(item.reason)}</i>`,
        { parse_mode: 'HTML' }
      ).catch(() => {});
    }

    db.prepare("UPDATE psc_requests SET status = 'rejected' WHERE id = ?").run(reqId);
    await ctx.answerCallbackQuery({ text: 'Pengajuan ditolak.' });
    return ctx.editMessageText(
      `❌ <b>PENGAJUAN PSC DITOLAK OWNER</b>\nTarget: ${escHtml(item.target_name)} (${item.amount} PSC)\nAlasan: <i>${escHtml(item.reason)}</i>`,
      { parse_mode: 'HTML' }
    ).catch(() => {});
  });

  // 3. Scheduler Pengingat Otomatis Api Spark Belum Nyala (Jam 20.00 WIB)
  setInterval(async () => {
    try {
      if (currentHourWib() !== 20) return;
      const today = todayWib();
      const settingKey = `spark_reminder_${today}`;
      const alreadySent = db.prepare('SELECT value FROM bot_settings WHERE key = ?').get(settingKey);
      if (alreadySent) return;

      db.prepare('INSERT OR REPLACE INTO bot_settings (key, value) VALUES (?, ?)').run(settingKey, '1');

      const pairs = db.prepare("SELECT * FROM spark_pairs WHERE status = 'paired' AND COALESCE(case_status, 'OPEN') != 'COMPLETED'").all();
      const unlitUsers = new Set();

      for (const p of pairs) {
        const d1 = db.prepare('SELECT gap, msg FROM spark_daily WHERE date = ? AND username = ?').get(today, p.user1);
        const d2 = db.prepare('SELECT gap, msg FROM spark_daily WHERE date = ? AND username = ?').get(today, p.user2);
        if (!d1 || ((d1.gap || 0) === 0 && (d1.msg || 0) === 0)) unlitUsers.add(p.user1);
        if (!d2 || ((d2.gap || 0) === 0 && (d2.msg || 0) === 0)) unlitUsers.add(p.user2);
      }

      if (!unlitUsers.size || !ENV.GROUP_ID) return;

      const mentions = Array.from(unlitUsers).slice(0, 15).map((u) => `@${escHtml(u)}`).join(' ');
      const kb = new InlineKeyboard();
      const sparkUrl = buildMiniAppUrl('spark');
      if (sparkUrl) kb.url('🔥 Nyalain Api Sekarang', sparkUrl);

      await bot.api.sendMessage(
        ENV.GROUP_ID,
        `⏰ <b>PENGINGAT API SPARK (20.00 WIB)</b>\n\nHalo ${mentions} — api Spark kalian hari ini belum nyala nih!\nKetik <code>/setor</code> di sini atau buka <b>Spark Buddies</b> sebelum reset jam 00.00 WIB ya cuy 🔥`,
        { parse_mode: 'HTML', reply_markup: sparkUrl ? kb : undefined }
      ).catch(() => {});
    } catch (_) {}
  }, 5 * 60 * 1000);
}
