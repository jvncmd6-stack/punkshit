import { Bot, InlineKeyboard } from 'grammy';
import { ENV } from '../config/env.js';
import { db } from '../database/db.js';
import {
  bindBotInstance,
  syncTelegramAvatar,
  broadcastToTelegram,
  escHtml,
  todayWib
} from '../services/syncEngine.js';

function rankTitle(streak) {
  if (streak >= 60) return '👑 Fosil Punkshit';
  if (streak >= 30) return '🔥 Biang Kerok';
  if (streak >= 14) return '🧨 Tukang Rusuh';
  if (streak >= 7) return '☕ Warga Tetap';
  if (streak >= 4) return '🚬 Anak Gang';
  return '🌱 Mayat Baru';
}

function calcAbsenBonus(streak) {
  const base = streak < 4 ? 2 : streak < 7 ? 3 : streak < 14 ? 5 : streak < 30 ? 7 : streak < 60 ? 10 : 15;
  return base + (streak % 7 === 0 ? 25 : 0);
}

export function initBot() {
  const bot = new Bot(ENV.BOT_TOKEN);
  bindBotInstance(bot);

  // Alamat publik Railway otomatis tersedia di environment variable RAILWAY_PUBLIC_DOMAIN
  const railwayApi = process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : (process.env.API_URL || '').trim();

  const openMarkasKb = (ctx, param = '') => {
    const kb = new InlineKeyboard();
    const qs = new URLSearchParams();
    if (railwayApi) qs.set('api', railwayApi);
    if (param) qs.set('startapp', param);
    const fullWebUrl = qs.toString() ? `${ENV.WEBAPP_URL}?${qs.toString()}` : ENV.WEBAPP_URL;

    // Jika dibuka dari Grup/Channel via t.me/bot/app, sisipkan API lewat startapp
    const startPayload = param
      ? `${param}__${Buffer.from(railwayApi).toString('base64url')}`
      : `home__${Buffer.from(railwayApi).toString('base64url')}`;
    const fullDirectLink = railwayApi
      ? `${ENV.MINIAPP_LINK}?startapp=${encodeURIComponent(startPayload)}`
      : (param ? `${ENV.MINIAPP_LINK}?startapp=${encodeURIComponent(param)}` : ENV.MINIAPP_LINK);

    return ctx.chat?.type === 'private'
      ? kb.webApp('🪪 BUKA PUNKSHIT.OS', fullWebUrl)
      : kb.url('🪪 BUKA PUNKSHIT.OS', fullDirectLink);
  };

  // /start & /markas
  bot.command(['start', 'markas'], ctx => {
    return ctx.reply(
      `🪪 <b>PUNKSHIT.OS — MARKAS ONLINE</b>\n` +
      `Wih, nongol juga. Markas masih berdiri kok, belum dialihfungsikan jadi minimarket.\n\n` +
      `Tap tombol di bawah buat buka Mini App:`,
      { parse_mode: 'HTML', reply_markup: openMarkasKb(ctx) }
    );
  });

  // /absen -> Absen langsung dari chat bot/grup dan otomatis sinkron ke Web
  bot.command('absen', async ctx => {
    const uid = String(ctx.from.id);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(uid);
    if (!user) {
      return ctx.reply('Lu belum punya PunkID bro. Buka markas dulu buat daftar!', {
        reply_markup: openMarkasKb(ctx)
      });
    }

    const today = todayWib();
    if (user.last_absen === today) {
      return ctx.reply(`🔥 Santai ${escHtml(user.name)}, lu udah absen hari ini (Streak: ${user.streak} hari).`, {
        parse_mode: 'HTML'
      });
    }

    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    const nextStreak = user.last_absen === yesterday ? user.streak + 1 : 1;
    const nextBest = Math.max(user.best, nextStreak);
    const earned = calcAbsenBonus(nextStreak);
    const now = Date.now();

    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE users SET psc = psc + ?, streak = ?, best = ?, cred = cred + 2, last_absen = ?, presence_at = ?
        WHERE id = ?
      `).run(earned, nextStreak, nextBest, today, now, uid);
      db.prepare('INSERT INTO transactions (user_id, type, amount, note, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(uid, 'absen', earned, `Absen via Bot hari ke-${nextStreak}`, now);
    });
    tx();

    syncTelegramAvatar(uid, ctx.from).catch(() => {});

    const feedMsg = `MASIH HIDUP TERNYATA. ${user.name} absen hari ke-${nextStreak} (+${earned} PSC).`;
    await broadcastToTelegram({
      target: 'group',
      text: `🔥 <b>MASIH HIDUP TERNYATA.</b>\n<b>${escHtml(user.name)}</b> absen hari ke-<b>${nextStreak}</b> (+${earned} PSC).`,
      buttonText: '🔥 IKUT ABSEN',
      startParam: 'absen',
      feedText: feedMsg
    });

    if (ctx.chat.type === 'private') {
      return ctx.reply(`✅ Absen hari ke-${nextStreak} berhasil! +${earned} PSC masuk dompet.`);
    }
  });

  // /saldo & /punkid
  bot.command(['saldo', 'punkid'], ctx => {
    const uid = String(ctx.from.id);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(uid);
    if (!user) {
      return ctx.reply('Belum punya PunkID. Buka markas dulu!', { reply_markup: openMarkasKb(ctx) });
    }

    return ctx.reply(
      `🪪 <b>PUNKID — ${escHtml(user.name.toUpperCase())}</b>\n` +
      `• No. Warga: <code>${escHtml(user.member_no)}</code>\n` +
      `• Pangkat: <b>${rankTitle(user.streak)}</b>\n` +
      `• Saldo PSC: <b>${user.psc} PSC</b>\n` +
      `• Streak Aktif: <b>${user.streak} hari</b> (Rekor: ${user.best})\n` +
      `• Street Cred: <b>${user.cred} poin</b>`,
      { parse_mode: 'HTML', reply_markup: openMarkasKb(ctx, 'gue') }
    );
  });

  // /top -> Hall of Fame singkat
  bot.command('top', ctx => {
    const rows = db.prepare('SELECT name, streak, psc FROM users ORDER BY streak DESC, psc DESC LIMIT 5').all();
    const list = rows.length
      ? rows.map((r, i) => `${i + 1}. <b>${escHtml(r.name)}</b> — ${r.streak} hari (${r.psc} PSC)`).join('\n')
      : 'Belum ada warga terdaftar.';

    return ctx.reply(`🏆 <b>HALL OF FAME — TOP STREAK</b>\n\n${list}`, {
      parse_mode: 'HTML',
      reply_markup: openMarkasKb(ctx, 'fame')
    });
  });

  // /bantuan
  bot.command('bantuan', ctx => {
    return ctx.reply(
      `🤖 <b>POS BANTUAN MAS RAKA</b>\n\n` +
      `• /markas — Buka Mini App PUNKSHIT.OS\n` +
      `• /absen — Absen harian cepat\n` +
      `• /punkid — Cek kartu identitas & saldo PSC\n` +
      `• /top — Klasemen warga terajin\n\n` +
      `Fitur lengkap (Lapak Rongsok, Avatar Border, Saweran, Mancing, Menfess, & Ruang Dalang) tersedia di Mini App.`,
      { parse_mode: 'HTML', reply_markup: openMarkasKb(ctx) }
    );
  });

  // Callback tombol [💰 SIKAT SAWERAN] di Grup Telegram
  bot.callbackQuery(/^claim_sw:(.+)$/, async ctx => {
    const sawId = ctx.match[1];
    const uid = String(ctx.from.id);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(uid);
    if (!user) {
      return ctx.answerCallbackQuery({
        text: 'Bikin PunkID dulu di Mini App sebelum sikat saweran!',
        show_alert: true
      });
    }

    const saw = db.prepare('SELECT * FROM saweran WHERE id = ?').get(sawId);
    if (!saw) {
      return ctx.answerCallbackQuery({ text: 'Saweran tidak ditemukan.', show_alert: true });
    }

    const claims = db.prepare('SELECT * FROM saweran_claims WHERE saweran_id = ?').all(sawId);
    if (claims.some(c => c.user_id === uid)) {
      return ctx.answerCallbackQuery({ text: 'Lu udah kebagian saweran ini bro, jangan maruk!', show_alert: true });
    }
    if (claims.length >= saw.quota || saw.remaining_amount <= 0) {
      return ctx.answerCallbackQuery({ text: '🏃 TOO LATE! Sawerannya udah ludes disikat warga.', show_alert: true });
    }

    const slotsLeft = saw.quota - claims.length;
    let won = 0;
    if (slotsLeft === 1) {
      won = saw.remaining_amount;
    } else if (saw.mode === 'random') {
      const maxTake = Math.max(1, Math.floor((saw.remaining_amount / slotsLeft) * 1.6));
      won = Math.max(1, Math.min(saw.remaining_amount - (slotsLeft - 1), Math.floor(Math.random() * maxTake) + 1));
    } else {
      won = Math.floor(saw.remaining_amount / slotsLeft);
    }

    const now = Date.now();
    const tx = db.transaction(() => {
      db.prepare('INSERT INTO saweran_claims (saweran_id, user_id, amount, claimed_at) VALUES (?, ?, ?, ?)')
        .run(sawId, uid, won, now);
      db.prepare('UPDATE saweran SET remaining_amount = remaining_amount - ? WHERE id = ?').run(won, sawId);
      db.prepare('UPDATE users SET psc = psc + ? WHERE id = ?').run(won, uid);
      db.prepare('INSERT INTO transactions (user_id, type, amount, note, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(uid, 'sawer_in', won, `Klaim saweran dari ${saw.creator_name}`, now);
    });
    tx();

    const nextCount = claims.length + 1;
    const kb = new InlineKeyboard();
    if (nextCount < saw.quota) {
      kb.text(`💰 SIKAT SAWERAN (${nextCount}/${saw.quota})`, `claim_sw:${sawId}`);
    } else {
      kb.url('✅ SAWERAN HABIS — BUKA MARKAS', ENV.MINIAPP_LINK);
    }

    try {
      await ctx.editMessageReplyMarkup({ reply_markup: kb });
    } catch {}

    return ctx.answerCallbackQuery({
      text: `💰 FREE MONEY SECURED! +${won} PSC masuk dompet lo!`,
      show_alert: true
    });
  });

  // Auto-Greet Warga Baru (Auto-delete 60 detik)
  bot.on('message:new_chat_members', async ctx => {
    const names = ctx.message.new_chat_members
      .filter(m => !m.is_bot)
      .map(m => escHtml(m.first_name))
      .join(', ');
    if (!names) return;

    const sent = await ctx.reply(
      `🚨 <b>WOI, ADA ORANG NYASAR!</b>\n` +
      `Welcome to Punkshit, <b>${names}</b>!\n\n` +
      `Satu penghuni baru berhasil masuk markas. Cetak <b>PunkID</b> lo sekarang biar resmi jadi warga! 💙💛`,
      { parse_mode: 'HTML', reply_markup: openMarkasKb(ctx) }
    );
    setTimeout(() => bot.api.deleteMessage(ctx.chat.id, sent.message_id).catch(() => {}), 60000);
  });

  // Auto-Farewell Warga Keluar (Auto-delete 60 detik)
  bot.on('message:left_chat_member', async ctx => {
    const m = ctx.message.left_chat_member;
    if (!m || m.is_bot) return;

    const sent = await ctx.reply(
      `⚰️ <b>SATU NYAWA TELAH GUGUR.</b>\n` +
      `<b>${escHtml(m.first_name)}</b> resmi meninggalkan markas. Press F to pay respect.`,
      { parse_mode: 'HTML' }
    );
    setTimeout(() => bot.api.deleteMessage(ctx.chat.id, sent.message_id).catch(() => {}), 60000);
  });

  bot.catch(err => console.error('[Bot Error]:', err.message));
  bot.start({ drop_pending_updates: true });
  console.log('[PUNKSHIT.OS] Bot Mas Raka aktif.');

  return bot;
}
