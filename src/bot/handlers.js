import { InlineKeyboard } from 'grammy';
import { ENV } from '../config/env.js';
import { db } from '../database/db.js';
import { escHtml, notifyPrivateUser, buildMiniAppUrl } from '../services/syncEngine.js';
import { registerLapakCommands } from './lapakCommands.js';
import {
  DEFAULT_GREET,
  DEFAULT_BYE,
  DEFAULT_PASAL,
  DEFAULT_HELP,
  getWarehouseId,
  getSetting,
  setSetting,
  isBotAdmin,
  isBotOwnerOrAdmin,
  formatTemplate,
  buildGreetKeyboard,
  buildByeKeyboard,
  renderPrivateHomeText,
  buildPrivateMenuKeyboard,
  buildTutorKeyboard,
  renderTutorMiniAppText,
  renderKamusText,
  renderAdminCmdText,
  renderRadioQueueText,
  renderGreetInfoText
} from './menus.js';

const SPARK_MIN_GAP = Number(process.env.SPARK_MIN_GAP || 5);
const SPARK_MIN_MSG = Number(process.env.SPARK_MIN_MSG || 2);
const SPARK_GAP_COOLDOWN = Number(process.env.SPARK_GAP_COOLDOWN || 30);

function todayWib() {
  const now = new Date(Date.now() + 7 * 3600 * 1000);
  return now.toISOString().slice(0, 10);
}

function logAudit(actorId, action, detail) {
  try {
    db.prepare('INSERT INTO audit_logs (actor_id, action, detail, created_at) VALUES (?, ?, ?, ?)')
      .run(String(actorId), action, detail, Date.now());
  } catch (e) {}
}

function purgeWargaData(userId, username = '') {
  const uid = String(userId);
  const usn = String(username || '').replace(/^@/, '').toLowerCase();

  const existing = db.prepare('SELECT id, name, username FROM users WHERE id = ?').get(uid);
  const targetUsn = usn || (existing?.username || '').toLowerCase();

  db.prepare('DELETE FROM users WHERE id = ?').run(uid);

  if (targetUsn) {
    try { db.prepare('DELETE FROM spark_pairs WHERE user1 = ? OR user2 = ?').run(targetUsn, targetUsn); } catch (e) {}
    try { db.prepare('DELETE FROM spark_daily WHERE username = ?').run(targetUsn); } catch (e) {}
  }

  try { db.prepare('DELETE FROM inventory WHERE user_id = ?').run(uid); } catch (e) {}
  try { db.prepare('DELETE FROM warga_shop_items WHERE seller_id = ?').run(uid); } catch (e) {}
  try { db.prepare('DELETE FROM member_market WHERE seller_id = ?').run(uid); } catch (e) {}

  return existing;
}

export function registerBotHandlers(bot) {
  // Daftarkan command khusus Lapak & Item Collab
  registerLapakCommands(bot);

  // 1. Tracker Spark Buddies di Grup
  bot.on('message', async (ctx, next) => {
    try {
      const chatType = ctx.chat?.type;
      const user = ctx.from;
      const isTargetGroup = !ENV.GROUP_ID || String(ctx.chat?.id) === String(ENV.GROUP_ID);

      if ((chatType === 'group' || chatType === 'supergroup') && isTargetGroup && user && !user.is_bot && user.username) {
        const usn = user.username.toLowerCase();
        const textLen = (ctx.message?.text || ctx.message?.caption || '').trim().length;

        if (textLen >= 3) {
          const today = todayWib();
          const nowSec = Math.floor(Date.now() / 1000);
          const act = db.prepare('SELECT gap, msg, last_msg_ts FROM spark_daily WHERE date = ? AND username = ?').get(today, usn);

          const gapAdd = (!act || (nowSec - act.last_msg_ts) >= SPARK_GAP_COOLDOWN) ? 1 : 0;
          const newGap = (act ? act.gap : 0) + gapAdd;
          const newMsg = (act ? act.msg : 0) + 1;

          db.prepare(`
            INSERT INTO spark_daily (date, username, gap, msg, last_msg_ts)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(date, username) DO UPDATE SET
              gap = excluded.gap,
              msg = excluded.msg,
              last_msg_ts = excluded.last_msg_ts
          `).run(today, usn, newGap, newMsg, nowSec);

          const pair = db.prepare(`
            SELECT * FROM spark_pairs
            WHERE (user1 = ? OR user2 = ?) AND status = 'paired'
            LIMIT 1
          `).get(usn, usn);

          if (pair) {
            const partner = pair.user1 === usn ? pair.user2 : pair.user1;
            const repliedUsn = (ctx.message?.reply_to_message?.from?.username || '').toLowerCase();
            if (repliedUsn && repliedUsn === partner) {
              db.prepare('UPDATE spark_pairs SET xp = xp + 5 WHERE id = ?').run(pair.id);
            }

            const pAct = db.prepare('SELECT gap, msg FROM spark_daily WHERE date = ? AND username = ?').get(today, partner);
            if (
              pAct &&
              newGap >= SPARK_MIN_GAP &&
              newMsg >= SPARK_MIN_MSG &&
              pAct.gap >= SPARK_MIN_GAP &&
              pAct.msg >= SPARK_MIN_MSG &&
              pair.last_qualified_date !== today
            ) {
              const newStreak = (pair.streak || 0) + 1;
              const newXp = (pair.xp || 0) + 10;
              db.prepare('UPDATE spark_pairs SET streak = ?, xp = ?, last_qualified_date = ? WHERE id = ?')
                .run(newStreak, newXp, today, pair.id);

              const pRow = db.prepare('SELECT id FROM users WHERE LOWER(username) = ?').get(partner);
              const sparkDm =
                `🔥 <b>SPARK HARIAN MENYALA!</b>\n\n` +
                `Kamu & @${escHtml(partner)} sudah aktif ngobrol hari ini!\n` +
                `• Streak: <b>${newStreak} Hari</b>\n` +
                `• Total XP: <b>${newXp} XP</b>`;

              await notifyPrivateUser(user.id, sparkDm, { buttonText: '🔥 CEK SPARK', startParam: 'spark' });
              if (pRow?.id) {
                await notifyPrivateUser(
                  pRow.id,
                  `🔥 <b>SPARK HARIAN MENYALA!</b>\n\nKamu & @${escHtml(usn)} sudah aktif ngobrol hari ini!\n• Streak: <b>${newStreak} Hari</b>\n• Total XP: <b>${newXp} XP</b>`,
                  { buttonText: '🔥 CEK SPARK', startParam: 'spark' }
                );
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('[Spark Tracker Error]:', e.message);
    }
    return next();
  });

  // 2. Command Utama & Panduan
  bot.command('start', async (ctx) => {
    if (ctx.chat.type === 'private') {
      await ctx.reply(renderPrivateHomeText(ctx.from.id), {
        parse_mode: 'HTML',
        reply_markup: buildPrivateMenuKeyboard(ctx.from.id)
      });
    } else {
      const kb = new InlineKeyboard();
      const appUrl = buildMiniAppUrl('home');
      if (appUrl) kb.url('🪪 Buka PUNKSHIT.OS', appUrl);
      await ctx.reply(
        '🪪 <b>PUNKSHIT.OS — MARKAS ONLINE</b>\nWih, nongol juga. Tap tombol di bawah buat buka Mini App:',
        { parse_mode: 'HTML', reply_markup: kb }
      );
    }
  });

  bot.command('tutor', async (ctx) => {
    const isPrivate = ctx.chat.type === 'private';
    await ctx.reply(renderTutorMiniAppText('overview'), {
      parse_mode: 'HTML',
      reply_markup: buildTutorKeyboard('overview', isPrivate)
    });
  });

  bot.command('kamus', async (ctx) => {
    const kb = new InlineKeyboard().text('📱 Tutor Mini App', 'pc_tutor_miniapp');
    if (isBotAdmin(ctx.from.id)) kb.text('⚙️ Command Admin', 'pc_admin_cmd');
    if (ctx.chat.type === 'private') kb.row().text('« Menu Utama', 'pc_home');
    await ctx.reply(renderKamusText(), { parse_mode: 'HTML', reply_markup: kb });
  });

  bot.command('myid', async (ctx) => {
    await ctx.reply(`🆔 Telegram ID kamu: <code>${ctx.from.id}</code>`, { parse_mode: 'HTML' });
  });

  bot.command('pasal', async (ctx) => {
    await ctx.reply(getSetting('pasal_text', DEFAULT_PASAL), { parse_mode: 'HTML' });
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(getSetting('help_text', DEFAULT_HELP), { parse_mode: 'HTML' });
  });

  // 3. Spark Buddies Commands
  bot.command('spark', async (ctx) => {
    const kb = new InlineKeyboard();
    const sparkUrl = buildMiniAppUrl('spark');
    if (sparkUrl) kb.url('🔥 Buka Spark Buddies', sparkUrl);
    await ctx.reply('🔥 <b>SPARK BUDDIES</b>\nNyalain api bareng partner markas kamu! Tap tombol di bawah:', { parse_mode: 'HTML', reply_markup: kb });
  });

  bot.command('acc', async (ctx) => {
    const usn = (ctx.from?.username || '').toLowerCase();
    if (!usn) return ctx.reply('Pasang @username Telegram dulu sebelum pakai Spark Buddies.');
    const row = db.prepare("SELECT id, user1 FROM spark_pairs WHERE user2 = ? AND status = 'pending' ORDER BY id DESC LIMIT 1").get(usn);
    if (!row) return ctx.reply('Nggak ada ajakan Spark yang masuk buat kamu saat ini.');
    db.prepare("UPDATE spark_pairs SET status = 'paired' WHERE id = ?").run(row.id);
    await ctx.reply(`🔥 <b>SPARK RESMI MENYALA!</b>\n@${escHtml(row.user1)} x @${escHtml(usn)} sekarang resmi jadi Spark Buddies!`, { parse_mode: 'HTML' });
  });

  // 4. Warga & Ekonomi Commands
  bot.command('delwarga', async (ctx) => {
    if (!isBotOwnerOrAdmin(ctx.from.id)) return ctx.reply('⛔ Khusus Owner & Admin.');
    const rawTarget = String(ctx.match || '').trim().replace(/^@/, '');
    const replyUser = ctx.message?.reply_to_message?.from;
    let targetUser = null;

    if (rawTarget) {
      targetUser = db.prepare('SELECT * FROM users WHERE id = ? OR LOWER(username) = LOWER(?)').get(rawTarget, rawTarget);
    } else if (replyUser && !replyUser.is_bot) {
      targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(String(replyUser.id));
    } else {
      return ctx.reply('Format: <code>/delwarga @username</code> atau <code>/delwarga 123456789</code>', { parse_mode: 'HTML' });
    }

    if (!targetUser) return ctx.reply('Data PunkID warga tersebut sudah tidak ada di database.');
    purgeWargaData(targetUser.id, targetUser.username);
    logAudit(ctx.from.id, 'DEL WARGA (BOT)', `Hapus PunkID ${targetUser.name} (${targetUser.id})`);
    await ctx.reply(`🗑️ <b>PUNKID DIHAPUS</b>\nData warga <b>${escHtml(targetUser.name)}</b> resmi dihapus.`, { parse_mode: 'HTML' });
  });

  bot.command('givepsc', async (ctx) => {
    if (!isBotOwnerOrAdmin(ctx.from.id)) return ctx.reply('⛔ Khusus Owner & Admin doang.');
    const args = String(ctx.match || '').trim().split(/\s+/).filter(Boolean);
    const replyUser = ctx.message?.reply_to_message?.from;
    let targetUser = null;
    let amount = 0;
    let reason = 'Top Up / Give Admin';

    if (replyUser && !replyUser.is_bot && args.length >= 1 && /^-?\d+$/.test(args[0])) {
      amount = Number(args[0]);
      if (args.length > 1) reason = args.slice(1).join(' ');
      targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(String(replyUser.id));
    } else if (args.length >= 2) {
      const rawTarget = args[0].replace(/^@/, '');
      amount = Number(args[1]);
      if (args.length > 2) reason = args.slice(2).join(' ');
      targetUser = db.prepare('SELECT * FROM users WHERE id = ? OR LOWER(username) = LOWER(?)').get(rawTarget, rawTarget);
    } else {
      return ctx.reply('Format: <code>/givepsc @username 500</code> atau reply pesan warga lalu <code>/givepsc 500</code>', { parse_mode: 'HTML' });
    }

    if (!amount || Number.isNaN(amount)) return ctx.reply('Nominal koin PSC harus berupa angka valid.');
    if (!targetUser) return ctx.reply('Warga belum terdaftar di database PunkID.');

    db.prepare('UPDATE users SET psc = MAX(0, psc + ?) WHERE id = ?').run(amount, targetUser.id);
    const updated = db.prepare('SELECT psc FROM users WHERE id = ?').get(targetUser.id);
    logAudit(ctx.from.id, 'GIVE PSC (BOT)', `${amount > 0 ? '+' : ''}${amount} PSC ke ${targetUser.name} (${reason})`);

    const sign = amount > 0 ? `+${amount}` : `${amount}`;
    await ctx.reply(
      `💰 <b>TRANSAKSI PSC BERHASIL</b>\n• Penerima: <b>${escHtml(targetUser.name)}</b>\n• Nominal: <b>${sign} PSC</b>\n• Saldo Sekarang: <b>${updated.psc} PSC</b>\n• Keterangan: <i>${escHtml(reason)}</i>`,
      { parse_mode: 'HTML' }
    );
  });

  bot.command('cekpsc', async (ctx) => {
    const rawTarget = String(ctx.match || '').trim().replace(/^@/, '');
    const replyUser = ctx.message?.reply_to_message?.from;
    let targetUser = null;

    if (rawTarget) {
      targetUser = db.prepare('SELECT * FROM users WHERE id = ? OR LOWER(username) = LOWER(?)').get(rawTarget, rawTarget);
    } else if (replyUser && !replyUser.is_bot) {
      targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(String(replyUser.id));
    } else {
      targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(String(ctx.from.id));
    }

    if (!targetUser) return ctx.reply('Data warga belum ditemukan di PunkID.');
    await ctx.reply(
      `💳 <b>DOMPET WARGA — ${escHtml(targetUser.name)}</b>\n• ID Warga: <code>${escHtml(targetUser.member_no || targetUser.id)}</code>\n• Role: <code>${escHtml((targetUser.role || 'member').toUpperCase())}</code>\n• Saldo PSC: <b>${targetUser.psc || 0} PSC</b>\n• Street Cred: <b>${targetUser.cred || 0}</b>`,
      { parse_mode: 'HTML' }
    );
  });

  bot.command('setrole', async (ctx) => {
    const senderId = String(ctx.from.id);
    if (!(ENV.OWNER_IDS || []).map(String).includes(senderId)) return ctx.reply('⛔ Khusus Owner utama.');
    const args = String(ctx.match || '').trim().split(/\s+/).filter(Boolean);
    if (args.length < 2) return ctx.reply('Format: <code>/setrole @username admin</code>', { parse_mode: 'HTML' });

    const rawTarget = args[0].replace(/^@/, '');
    const role = args[1].toLowerCase();
    if (!['admin', 'moderator', 'member'].includes(role)) return ctx.reply('Role cuma boleh: admin, moderator, atau member.');

    const targetUser = db.prepare('SELECT * FROM users WHERE id = ? OR LOWER(username) = LOWER(?)').get(rawTarget, rawTarget);
    if (!targetUser) return ctx.reply('Warga kaga ketemu di database PunkID.');

    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, targetUser.id);
    logAudit(senderId, 'SET ROLE (BOT)', `${targetUser.name} -> ${role}`);
    await ctx.reply(`✅ Role <b>${escHtml(targetUser.name)}</b> diubah menjadi <b>${role.toUpperCase()}</b>.`, { parse_mode: 'HTML' });
  });

  // 5. Radio & Greet Settings
  bot.command('req', async (ctx) => {
    const raw = String(ctx.match || '').trim();
    const parts = raw.split('|').map((s) => s.trim());
    const song = (parts[0] || '').slice(0, 80);
    const link = (parts[1] || '').slice(0, 180);
    if (song.length < 3 || !/^https:\/\/open\.spotify\.com\//.test(link)) {
      return ctx.reply('Format: <code>/req Judul Lagu - Artis | https://open.spotify.com/track/...</code>', { parse_mode: 'HTML' });
    }
    const senderName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || 'Warga';
    const info = db.prepare("INSERT INTO radio_queue (user_id, user_name, source_type, song, link, file_id, message, status, created_at) VALUES (?, ?, 'spotify', ?, ?, '', '', 'waiting', ?)").run(String(ctx.from.id), senderName, song, link, Date.now());
    const reqId = info.lastInsertRowid;
    const warehouseId = getWarehouseId();
    if (warehouseId) {
      const kb = new InlineKeyboard().url('Buka di Spotify', link);
      await bot.api.sendMessage(warehouseId, `<b>REQUEST SPOTIFY #${reqId}</b>\nJudul: <b>${escHtml(song)}</b>\nDari: <b>${escHtml(senderName)}</b>\nLink: ${escHtml(link)}`, { parse_mode: 'HTML', reply_markup: kb }).catch(() => {});
    }
    await ctx.reply(`✅ Sip, request #${reqId} (<b>${escHtml(song)}</b>) masuk antrean.`, { parse_mode: 'HTML' });
  });

  bot.on(['message:audio', 'message:document'], async (ctx, next) => {
    if (ctx.chat.type !== 'private') return next();
    const audio = ctx.message.audio;
    const doc = ctx.message.document;
    const isAudioDoc = doc && doc.mime_type && doc.mime_type.startsWith('audio/');
    if (!audio && !isAudioDoc) return next();
    const warehouseId = getWarehouseId();
    if (!warehouseId) return ctx.reply('Channel Gudang belum diset sama admin.');

    const fileId = audio ? audio.file_id : doc.file_id;
    const song = (String(ctx.message.caption || '').trim() || (audio && [audio.performer, audio.title].filter(Boolean).join(' - ')) || (doc && doc.file_name) || 'Audio Request Warga').slice(0, 80);
    const senderName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || 'Warga';
    const info = db.prepare("INSERT INTO radio_queue (user_id, user_name, source_type, song, link, file_id, message, status, created_at) VALUES (?, ?, 'audio', ?, '', ?, '', 'waiting', ?)").run(String(ctx.from.id), senderName, song, fileId, Date.now());
    const reqId = info.lastInsertRowid;
    try {
      await bot.api.sendAudio(warehouseId, fileId, { caption: `<b>GUDANG MUSIK — REQUEST #${reqId}</b>\nJudul: <b>${escHtml(song)}</b>\nDari: <b>${escHtml(senderName)}</b>`, parse_mode: 'HTML' });
      await ctx.reply(`✅ File <b>${escHtml(song)}</b> masuk Gudang Musik antrean <b>#${reqId}</b>.`, { parse_mode: 'HTML' });
    } catch (err) {
      await ctx.reply(`Gagal kirim file ke Gudang: ${err.message}`);
    }
  });

  bot.command('antrean', async (ctx) => {
    const kb = new InlineKeyboard();
    const radioUrl = buildMiniAppUrl('radio');
    if (radioUrl) kb.url('Nitip Lagu di Mini App', radioUrl);
    if (isBotAdmin(ctx.from.id)) kb.row().text('🔄 Refresh', 'pc_radio_queue').text('🗑️ Kosongkan', 'pc_radio_clear');
    if (ctx.chat.type === 'private') kb.row().text('« Menu Utama', 'pc_home');
    await ctx.reply(renderRadioQueueText(), { parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: kb });
  });

  bot.command('done', async (ctx) => {
    if (!isBotAdmin(ctx.from.id)) return;
    const id = Number(String(ctx.match || '').trim().replace(/^#/, ''));
    if (!id) return ctx.reply('Format: /done <nomor_id>');
    const info = db.prepare("UPDATE radio_queue SET status = 'played' WHERE id = ? AND status = 'waiting'").run(id);
    await ctx.reply(info.changes ? `✅ Request #${id} dicoret dari antrean.` : `Request #${id} tidak ditemukan.`);
  });

  bot.command('clearradio', async (ctx) => {
    if (!isBotAdmin(ctx.from.id)) return;
    db.prepare("UPDATE radio_queue SET status = 'played' WHERE status = 'waiting'").run();
    await ctx.reply('✅ Semua antrean Radio Gang dikosongin.');
  });

  bot.command('setpasal', async (ctx) => {
    if (ctx.chat.type !== 'private' || !isBotAdmin(ctx.from.id)) return;
    const text = String(ctx.match || '').trim();
    if (text.length < 5) return ctx.reply('Format: /setpasal teks baru...');
    setSetting('pasal_text', text);
    await ctx.reply('✅ Teks Pasal berhasil di-update.');
  });

  bot.command('sethelp', async (ctx) => {
    if (ctx.chat.type !== 'private' || !isBotAdmin(ctx.from.id)) return;
    const text = String(ctx.match || '').trim();
    if (text.length < 5) return ctx.reply('Format: /sethelp teks baru...');
    setSetting('help_text', text);
    await ctx.reply('✅ Teks Help berhasil di-update.');
  });

  bot.command('greetinfo', async (ctx) => {
    if (ctx.chat.type !== 'private' || !isBotAdmin(ctx.from.id)) return;
    const kb = new InlineKeyboard().text('⚙️ Command Admin', 'pc_admin_cmd').row().text('« Menu Utama', 'pc_home');
    await ctx.reply(renderGreetInfoText(), { parse_mode: 'HTML', reply_markup: kb });
  });

  bot.command('setgreet', async (ctx) => {
    if (ctx.chat.type !== 'private' || !isBotAdmin(ctx.from.id)) return;
    const text = String(ctx.match || '').trim();
    if (text.length < 3) return ctx.reply('Format: /setgreet Selamat datang {mention}...');
    setSetting('greet_text', text);
    await ctx.reply('✅ Teks Greet berhasil diganti.');
  });

  bot.command('setbye', async (ctx) => {
    if (ctx.chat.type !== 'private' || !isBotAdmin(ctx.from.id)) return;
    const text = String(ctx.match || '').trim();
    if (text.length < 3) return ctx.reply('Format: /setbye Yah {name} cabut...');
    setSetting('bye_text', text);
    await ctx.reply('✅ Teks Bye berhasil diganti.');
  });

  bot.command('setgreetmedia', async (ctx) => {
    if (ctx.chat.type !== 'private' || !isBotAdmin(ctx.from.id)) return;
    const reply = ctx.message?.reply_to_message;
    if (!reply) return ctx.reply('Reply GIF atau Stiker dengan /setgreetmedia.');
    if (reply.animation) { setSetting('greet_media', `animation:${reply.animation.file_id}`); return ctx.reply('✅ GIF Greet dipasang.'); }
    if (reply.sticker) { setSetting('greet_media', `sticker:${reply.sticker.file_id}`); return ctx.reply('✅ Stiker Greet dipasang.'); }
    await ctx.reply('Cuma bisa reply GIF atau Stiker.');
  });

  bot.command('setbyemedia', async (ctx) => {
    if (ctx.chat.type !== 'private' || !isBotAdmin(ctx.from.id)) return;
    const reply = ctx.message?.reply_to_message;
    if (!reply) return ctx.reply('Reply GIF atau Stiker dengan /setbyemedia.');
    if (reply.animation) { setSetting('bye_media', `animation:${reply.animation.file_id}`); return ctx.reply('✅ GIF Bye dipasang.'); }
    if (reply.sticker) { setSetting('bye_media', `sticker:${reply.sticker.file_id}`); return ctx.reply('✅ Stiker Bye dipasang.'); }
    await ctx.reply('Cuma bisa reply GIF atau Stiker.');
  });

  bot.command('delgreetmedia', async (ctx) => {
    if (ctx.chat.type !== 'private' || !isBotAdmin(ctx.from.id)) return;
    setSetting('greet_media', '');
    await ctx.reply('✅ Media Greet dicopot.');
  });

  bot.command('delbyemedia', async (ctx) => {
    if (ctx.chat.type !== 'private' || !isBotAdmin(ctx.from.id)) return;
    setSetting('bye_media', '');
    await ctx.reply('✅ Media Bye dicopot.');
  });

  // 6. Callback Inline Buttons
  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;
    const admin = isBotAdmin(ctx.from.id);
    const isPrivate = ctx.chat?.type === 'private';

    if (data.startsWith('spark_acc:') || data.startsWith('spark_dec:')) {
      const [mode, rawSender, rawTarget] = data.split(':');
      const sender = (rawSender || '').toLowerCase();
      const target = (rawTarget || '').toLowerCase();
      const clicker = (ctx.from?.username || '').toLowerCase();

      if (!clicker || clicker !== target) {
        return ctx.answerCallbackQuery({ text: `Cuma @${target} yang bisa pencet tombol ini!`, show_alert: true });
      }
      if (mode === 'spark_acc') {
        const row = db.prepare("SELECT id FROM spark_pairs WHERE user1 = ? AND user2 = ? AND status = 'pending'").get(sender, clicker);
        if (!row) return ctx.answerCallbackQuery({ text: 'Ajakan sudah kadaluarsa.', show_alert: true });
        db.prepare("UPDATE spark_pairs SET status = 'paired' WHERE id = ?").run(row.id);
        await ctx.editMessageText(`🔥 <b>SPARK RESMI MENYALA!</b>\n@${escHtml(sender)} x @${escHtml(clicker)} sekarang resmi jadi Spark Buddies!`, { parse_mode: 'HTML' }).catch(() => {});
        return ctx.answerCallbackQuery({ text: 'Spark resmi menyala! 🔥' });
      }
      db.prepare('DELETE FROM spark_pairs WHERE (user1 = ? AND user2 = ?) OR (user1 = ? AND user2 = ?)').run(sender, clicker, clicker, sender);
      await ctx.editMessageText(`💨 Ajakan Spark dari @${escHtml(sender)} ke @${escHtml(clicker)} ditolak.`, { parse_mode: 'HTML' }).catch(() => {});
      return ctx.answerCallbackQuery({ text: 'Ajakan ditolak.' });
    }

    if (data === 'pc_home') {
      await ctx.editMessageText(renderPrivateHomeText(ctx.from.id), { parse_mode: 'HTML', reply_markup: buildPrivateMenuKeyboard(ctx.from.id) }).catch(() => {});
      return ctx.answerCallbackQuery();
    }
    if (data === 'pc_tutor_miniapp' || data.startsWith('pc_tutor_')) {
      const page = data === 'pc_tutor_miniapp' ? 'overview' : data.replace('pc_tutor_', '');
      await ctx.editMessageText(renderTutorMiniAppText(page), { parse_mode: 'HTML', reply_markup: buildTutorKeyboard(page, isPrivate) }).catch(() => {});
      return ctx.answerCallbackQuery();
    }
    if (data === 'pc_kamus') {
      const kb = new InlineKeyboard().text('📱 Tutor Mini App', 'pc_tutor_miniapp');
      if (admin) kb.text('⚙️ Command Admin', 'pc_admin_cmd');
      kb.row().text('« Menu Utama', 'pc_home');
      await ctx.editMessageText(renderKamusText(), { parse_mode: 'HTML', reply_markup: kb }).catch(() => {});
      return ctx.answerCallbackQuery();
    }
    if (data === 'pc_admin_cmd') {
      if (!admin) return ctx.answerCallbackQuery({ text: 'Khusus Owner/Admin!', show_alert: true });
      const kb = new InlineKeyboard().text('📝 Teks Greet & Bye', 'pc_greet_info').text('📖 Kamus Warga', 'pc_kamus').row().text('« Menu Utama', 'pc_home');
      await ctx.editMessageText(renderAdminCmdText(), { parse_mode: 'HTML', reply_markup: kb }).catch(() => {});
      return ctx.answerCallbackQuery();
    }
    if (data === 'pc_greet_info') {
      if (!admin) return ctx.answerCallbackQuery({ text: 'Khusus Owner & Admin.', show_alert: true });
      const kb = new InlineKeyboard().text('⚙️ Command Admin', 'pc_admin_cmd').row().text('« Menu Utama', 'pc_home');
      await ctx.editMessageText(renderGreetInfoText(), { parse_mode: 'HTML', reply_markup: kb }).catch(() => {});
      return ctx.answerCallbackQuery();
    }
    if (data === 'pc_radio_queue') {
      const kb = new InlineKeyboard().text('🔄 Refresh', 'pc_radio_queue');
      if (admin) kb.text('🗑️ Kosongkan', 'pc_radio_clear');
      kb.row().text('📱 Tutor Mini App', 'pc_tutor_miniapp').text('« Menu Utama', 'pc_home');
      await ctx.editMessageText(renderRadioQueueText(), { parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: kb }).catch(() => {});
      return ctx.answerCallbackQuery({ text: 'Antrean di-refresh.' });
    }
    if (data === 'pc_radio_clear') {
      if (!admin) return ctx.answerCallbackQuery({ text: 'Khusus Owner & Admin.', show_alert: true });
      db.prepare("UPDATE radio_queue SET status = 'played' WHERE status = 'waiting'").run();
      const kb = new InlineKeyboard().text('🔄 Refresh', 'pc_radio_queue').row().text('« Menu Utama', 'pc_home');
      await ctx.editMessageText(renderRadioQueueText(), { parse_mode: 'HTML', reply_markup: kb }).catch(() => {});
      return ctx.answerCallbackQuery({ text: 'Antrean dikosongin.' });
    }

    await ctx.answerCallbackQuery();
  });

  // 7. Greet & Bye
  bot.on('message:new_chat_members', async (ctx) => {
    const members = ctx.message.new_chat_members || [];
    let count = 0;
    try { count = await ctx.getChatMemberCount(); } catch (e) {}
    const tpl = getSetting('greet_text', DEFAULT_GREET);
    const mediaRaw = getSetting('greet_media', '');
    const kb = buildGreetKeyboard();

    for (const m of members) {
      if (m.is_bot) continue;
      const body = formatTemplate(tpl, m, count);
      try {
        if (mediaRaw.startsWith('animation:')) await ctx.replyWithAnimation(mediaRaw.slice(10),
