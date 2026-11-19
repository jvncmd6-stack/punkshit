import { Bot, InlineKeyboard } from 'grammy';
import { ENV } from '../config/env.js';
import { db } from '../database/db.js';
import { escHtml } from '../services/syncEngine.js';

let botInstance = null;

// Tabel penyimpanan pengaturan Greet & Bye agar permanen di Volume Railway
db.exec(`
  CREATE TABLE IF NOT EXISTS bot_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`);

function getSetting(key, fallback = '') {
  const row = db.prepare('SELECT value FROM bot_settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

function setSetting(key, value) {
  db.prepare(`
    INSERT INTO bot_settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, String(value));
}

// Default teks bersih (minim emoji & informatif)
const DEFAULT_GREET =
  'Selamat datang di markas, {mention}.\n\n' +
  'Silakan cetak kartu identitas PunkID, cek aturan tongkrongan di Pasal & Help, dan pantau info terbaru lewat tombol di bawah.';

const DEFAULT_BYE =
  '{name} ({username}) telah meninggalkan markas.\n\n' +
  'Akses PunkID dan aktivitas tongkrongan resmi ditutup.';

// Cek apakah pengirim adalah Owner atau Admin
function isBotAdmin(userId) {
  const uid = String(userId);
  if ((ENV.OWNER_IDS || []).map(String).includes(uid)) return true;
  const u = db.prepare('SELECT role FROM users WHERE id = ?').get(uid);
  return Boolean(u && (u.role === 'owner' || u.role === 'admin'));
}

// Susun tombol Inline untuk pesan Greet
function buildGreetKeyboard() {
  const kb = new InlineKeyboard();
  const appLink = ENV.MINIAPP_LINK || '';
  const chUrl = (process.env.CHANNEL_URL || '').trim();

  if (appLink) {
    kb.url('Buka PunkID & Markas', appLink);
    kb.url('Pasal & Help', `${appLink}?startapp=rules`);
  }
  if (chUrl) {
    kb.row().url('Channel Info', chUrl);
  }
  return kb;
}

// Susun tombol Inline untuk pesan Bye
function buildByeKeyboard() {
  const kb = new InlineKeyboard();
  const appLink = ENV.MINIAPP_LINK || '';
  if (appLink) {
    kb.url('Lihat Daftar Warga', `${appLink}?startapp=warga`);
  }
  return kb;
}

// Format placeholder teks
function formatTemplate(tpl, member, totalCount) {
  const fullName = [member.first_name, member.last_name].filter(Boolean).join(' ') || 'Warga';
  const safeName = escHtml(fullName);
  const mention = `<a href="tg://user?id=${member.id}">${safeName}</a>`;
  const username = member.username ? `@${escHtml(member.username)}` : 'tanpa username';

  return escHtml(tpl)
    .replace(/\{name\}/gi, safeName)
    .replace(/\{mention\}/gi, mention)
    .replace(/\{username\}/gi, username)
    .replace(/\{count\}/gi, String(totalCount || '-'));
}

export function startBot() {
  if (!ENV.BOT_TOKEN) {
    console.warn('[PUNKSHIT.OS] BOT_TOKEN kosong, bot dilewati.');
    return null;
  }

  const bot = new Bot(ENV.BOT_TOKEN);
  botInstance = bot;

  // /start di PC atau Grup
  bot.command('start', async (ctx) => {
    const kb = new InlineKeyboard();
    if (ENV.MINIAPP_LINK) {
      kb.url('Buka PUNKSHIT.OS', ENV.MINIAPP_LINK);
    }
    const groupUrl = (process.env.GROUP_URL || '').trim();
    if (groupUrl) {
      kb.row().url('Grup Markas', groupUrl);
    }

    await ctx.reply(
      '<b>PUNKSHIT.OS — Sistem Markas Digital</b>\n\n' +
      'Gunakan tombol di bawah untuk membuka aplikasi, cetak PunkID, cek Absen Nyawa, dan akses Lapak Warga.\n\n' +
      '<i>Admin: ketik /greetinfo di chat pribadi ini untuk mengatur pesan sambutan & keluar grup.</i>',
      { parse_mode: 'HTML', reply_markup: kb }
    );
  });

  // /greetinfo -> Panduan & preview setting di PC
  bot.command('greetinfo', async (ctx) => {
    if (ctx.chat.type !== 'private') return;
    if (!isBotAdmin(ctx.from.id)) return ctx.reply('Akses ditolak. Khusus Owner & Admin.');

    const greetText = getSetting('greet_text', DEFAULT_GREET);
    const byeText = getSetting('bye_text', DEFAULT_BYE);
    const greetMedia = getSetting('greet_media', '');
    const byeMedia = getSetting('bye_media', '');

    const info =
      '<b>PENGATURAN GREET & BYE GRUP</b>\n\n' +
      '<b>1. Ubah Teks:</b>\n' +
      '• <code>/setgreet teks baru</code>\n' +
      '• <code>/setbye teks baru</code>\n' +
      'Variabel: <code>{name}</code>, <code>{mention}</code>, <code>{username}</code>, <code>{count}</code>\n\n' +
      '<b>2. Pasang GIF atau Stiker:</b>\n' +
      '• Reply (balas) GIF/Stiker di chat ini lalu ketik <code>/setgreetmedia</code>\n' +
      '• Reply (balas) GIF/Stiker di chat ini lalu ketik <code>/setbyemedia</code>\n' +
      '• Hapus media: <code>/delgreetmedia</code> atau <code>/delbyemedia</code>\n\n' +
      '<b>Status Saat Ini:</b>\n' +
      `• Media Greet: <b>${greetMedia ? greetMedia.split(':')[0].toUpperCase() + ' Terpasang' : 'Kosong'}</b>\n` +
      `• Media Bye: <b>${byeMedia ? byeMedia.split(':')[0].toUpperCase() + ' Terpasang' : 'Kosong'}</b>\n\n` +
      `<b>Teks Greet:</b>\n<i>${escHtml(greetText)}</i>\n\n` +
      `<b>Teks Bye:</b>\n<i>${escHtml(byeText)}</i>`;

    await ctx.reply(info, { parse_mode: 'HTML' });
  });

  // /setgreet <teks> -> Set teks welcome di PC
  bot.command('setgreet', async (ctx) => {
    if (ctx.chat.type !== 'private') return;
    if (!isBotAdmin(ctx.from.id)) return ctx.reply('Akses ditolak. Khusus Owner & Admin.');

    const text = String(ctx.match || '').trim();
    if (text.length < 3) {
      return ctx.reply('Format salah. Contoh:\n/setgreet Selamat datang {mention} di markas! Total warga sekarang {count} orang.');
    }

    setSetting('greet_text', text);
    await ctx.reply('Teks Greet (sambutan member masuk) berhasil diperbarui.');
  });

  // /setbye <teks> -> Set teks goodbye di PC
  bot.command('setbye', async (ctx) => {
    if (ctx.chat.type !== 'private') return;
    if (!isBotAdmin(ctx.from.id)) return ctx.reply('Akses ditolak. Khusus Owner & Admin.');

    const text = String(ctx.match || '').trim();
    if (text.length < 3) {
      return ctx.reply('Format salah. Contoh:\n/setbye {name} telah keluar dari markas.');
    }

    setSetting('bye_text', text);
    await ctx.reply('Teks Bye (member keluar) berhasil diperbarui.');
  });

  // /setgreetmedia -> Reply GIF atau Stiker di PC
  bot.command('setgreetmedia', async (ctx) => {
    if (ctx.chat.type !== 'private') return;
    if (!isBotAdmin(ctx.from.id)) return ctx.reply('Akses ditolak. Khusus Owner & Admin.');

    const reply = ctx.message?.reply_to_message;
    if (!reply) {
      return ctx.reply('Caranya: kirim atau teruskan GIF / Stiker ke chat ini, lalu balas (reply) media tersebut dengan ketik /setgreetmedia');
    }

    if (reply.animation) {
      setSetting('greet_media', `animation:${reply.animation.file_id}`);
      return ctx.reply('GIF berhasil dipasang untuk pesan Greet grup.');
    }
    if (reply.sticker) {
      setSetting('greet_media', `sticker:${reply.sticker.file_id}`);
      return ctx.reply('Stiker berhasil dipasang untuk pesan Greet grup.');
    }

    await ctx.reply('Format tidak didukung. Hanya bisa reply GIF atau Stiker.');
  });

  // /setbyemedia -> Reply GIF atau Stiker di PC
  bot.command('setbyemedia', async (ctx) => {
    if (ctx.chat.type !== 'private') return;
    if (!isBotAdmin(ctx.from.id)) return ctx.reply('Akses ditolak. Khusus Owner & Admin.');

    const reply = ctx.message?.reply_to_message;
    if (!reply) {
      return ctx.reply('Caranya: kirim atau teruskan GIF / Stiker ke chat ini, lalu balas (reply) media tersebut dengan ketik /setbyemedia');
    }

    if (reply.animation) {
      setSetting('bye_media', `animation:${reply.animation.file_id}`);
      return ctx.reply('GIF berhasil dipasang untuk pesan Bye grup.');
    }
    if (reply.sticker) {
      setSetting('bye_media', `sticker:${reply.sticker.file_id}`);
      return ctx.reply('Stiker berhasil dipasang untuk pesan Bye grup.');
    }

    await ctx.reply('Format tidak didukung. Hanya bisa reply GIF atau Stiker.');
  });

  // Hapus media Greet / Bye
  bot.command('delgreetmedia', async (ctx) => {
    if (ctx.chat.type !== 'private' || !isBotAdmin(ctx.from.id)) return;
    setSetting('greet_media', '');
    await ctx.reply('Media GIF/Stiker Greet telah dihapus.');
  });

  bot.command('delbyemedia', async (ctx) => {
    if (ctx.chat.type !== 'private' || !isBotAdmin(ctx.from.id)) return;
    setSetting('bye_media', '');
    await ctx.reply('Media GIF/Stiker Bye telah dihapus.');
  });

  // Event Member Baru Masuk Grup
  bot.on('message:new_chat_members', async (ctx) => {
    const members = ctx.message.new_chat_members || [];
    let count = 0;
    try {
      count = await ctx.getChatMemberCount();
    } catch (e) {}

    const tpl = getSetting('greet_text', DEFAULT_GREET);
    const mediaRaw = getSetting('greet_media', '');
    const kb = buildGreetKeyboard();

    for (const m of members) {
      if (m.is_bot) continue;
      const body = formatTemplate(tpl, m, count);

      try {
        if (mediaRaw.startsWith('animation:')) {
          const fileId = mediaRaw.slice('animation:'.length);
          await ctx.replyWithAnimation(fileId, {
            caption: body,
            parse_mode: 'HTML',
            reply_markup: kb
          });
        } else if (mediaRaw.startsWith('sticker:')) {
          const fileId = mediaRaw.slice('sticker:'.length);
          await ctx.replyWithSticker(fileId);
          await ctx.reply(body, {
            parse_mode: 'HTML',
            reply_markup: kb,
            disable_web_page_preview: true
          });
        } else {
          await ctx.reply(body, {
            parse_mode: 'HTML',
            reply_markup: kb,
            disable_web_page_preview: true
          });
        }
      } catch (err) {
        console.error('[Greet Error]:', err.message);
      }
    }
  });

  // Event Member Keluar dari Grup
  bot.on('message:left_chat_member', async (ctx) => {
    const m = ctx.message.left_chat_member;
    if (!m || m.is_bot) return;

    let count = 0;
    try {
      count = await ctx.getChatMemberCount();
    } catch (e) {}

    const tpl = getSetting('bye_text', DEFAULT_BYE);
    const mediaRaw = getSetting('bye_media', '');
    const kb = buildByeKeyboard();
    const body = formatTemplate(tpl, m, count);

    try {
      if (mediaRaw.startsWith('animation:')) {
        const fileId = mediaRaw.slice('animation:'.length);
        await ctx.replyWithAnimation(fileId, {
          caption: body,
          parse_mode: 'HTML',
          reply_markup: kb
        });
      } else if (mediaRaw.startsWith('sticker:')) {
        const fileId = mediaRaw.slice('sticker:'.length);
        await ctx.replyWithSticker(fileId);
        await ctx.reply(body, {
          parse_mode: 'HTML',
          reply_markup: kb,
          disable_web_page_preview: true
        });
      } else {
        await ctx.reply(body, {
          parse_mode: 'HTML',
          reply_markup: kb,
          disable_web_page_preview: true
        });
      }
    } catch (err) {
      console.error('[Bye Error]:', err.message);
    }
  });

  bot.catch((err) => {
    console.error('[Bot Error]:', err.message);
  });

  bot.start({
    drop_pending_updates: true,
    onStart: () => console.log('[PUNKSHIT.OS] Bot Mas Raka aktif.')
  });

  return bot;
}

export function getBotInstance() {
  return botInstance;
}

export default startBot;
