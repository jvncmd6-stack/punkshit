import { Bot, InlineKeyboard } from 'grammy';
import { ENV } from '../config/env.js';
import { db } from '../database/db.js';
import { escHtml } from '../services/syncEngine.js';

let botInstance = null;

// Pastikan tabel pengaturan bot & antrean radio tersedia di SQLite
db.exec(`
  CREATE TABLE IF NOT EXISTS bot_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS radio_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    source_type TEXT DEFAULT 'spotify',
    song TEXT NOT NULL,
    link TEXT DEFAULT '',
    file_id TEXT DEFAULT '',
    message TEXT DEFAULT '',
    status TEXT DEFAULT 'waiting',
    created_at INTEGER NOT NULL
  );
`);

// Migrasi kolom aman jika tabel radio_queue versi lama sudah terlanjur dibuat
try { db.exec("ALTER TABLE radio_queue ADD COLUMN source_type TEXT DEFAULT 'spotify'"); } catch (e) {}
try { db.exec("ALTER TABLE radio_queue ADD COLUMN file_id TEXT DEFAULT ''"); } catch (e) {}

function getWarehouseId() {
  return (process.env.WAREHOUSE_CHANNEL_ID || '').trim();
}

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

const DEFAULT_GREET =
  'Selamat datang di markas, {mention}.\n\n' +
  'Silakan cetak kartu identitas PunkID, cek aturan tongkrongan di Pasal & Help, dan pantau info terbaru lewat tombol di bawah.';

const DEFAULT_BYE =
  '{name} ({username}) telah meninggalkan markas.\n\n' +
  'Akses PunkID dan aktivitas tongkrongan resmi ditutup.';

function isBotAdmin(userId) {
  const uid = String(userId);
  if ((ENV.OWNER_IDS || []).map(String).includes(uid)) return true;
  const u = db.prepare('SELECT role FROM users WHERE id = ?').get(uid);
  return Boolean(u && (u.role === 'owner' || u.role === 'admin' || u.role === 'moderator'));
}

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

function buildByeKeyboard() {
  const kb = new InlineKeyboard();
  const appLink = ENV.MINIAPP_LINK || '';
  if (appLink) {
    kb.url('Lihat Daftar Warga', `${appLink}?startapp=warga`);
  }
  return kb;
}

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

function buildPrivateMenuKeyboard(isAdmin) {
  const kb = new InlineKeyboard();
  if (ENV.MINIAPP_LINK) {
    kb.url('Buka PUNKSHIT.OS', ENV.MINIAPP_LINK);
  }
  const groupUrl = (process.env.GROUP_URL || '').trim();
  if (groupUrl) {
    kb.url('Grup Markas', groupUrl);
  }
  kb.row().text('Antrean Request Radio', 'pc_radio_queue');
  if (isAdmin) {
    kb.row()
      .text('Kamus Command Admin', 'pc_kamus')
      .text('Status Greet & Bye', 'pc_greet_info');
  }
  return kb;
}

function renderRadioQueueText() {
  const list = db.prepare(`
    SELECT id, user_name, source_type, song, link, message
    FROM radio_queue
    WHERE status = 'waiting'
    ORDER BY id ASC
    LIMIT 25
  `).all();

  if (!list.length) {
    return (
      '<b>ANTREAN RADIO GANG (OS)</b>\n\n' +
      'Belum ada request lagu yang mengantre.\n\n' +
      '<b>Cara Warga Request Lagu:</b>\n' +
      '• <b>Link Spotify:</b> Kirim lewat menu <i>Radio Gang</i> di WebApp atau ketik <code>/req Judul - Artis | https://open.spotify.com/...</code>\n' +
      '• <b>File Musik (MP3/M4A):</b> Kirim langsung file audionya ke chat pribadi bot ini dengan caption judul lagu.'
    );
  }

  const lines = list.map((item, idx) => {
    const badge = item.source_type === 'audio' ? '[FILE GUDANG]' : '[SPOTIFY]';
    const linkPart = item.link ? `\n   Link: ${escHtml(item.link)}` : '';
    const msgPart = item.message ? `\n   Pesan: <i>"${escHtml(item.message)}"</i>` : '';
    return `<b>${idx + 1}. #${item.id} ${badge} ${escHtml(item.song)}</b>\n   Requester: ${escHtml(item.user_name)}${linkPart}${msgPart}`;
  });

  return (
    `<b>ANTREAN RADIO GANG (${list.length} Lagu)</b>\n\n` +
    lines.join('\n\n') +
    '\n\n<i>Admin: ketik /done <ID> setelah lagu diputar di OS, atau /clearradio untuk mengosongkan antrean.</i>'
  );
}

function renderKamusText() {
  const wh = getWarehouseId();
  return (
    '<b>KAMUS COMMAND BOT MAS RAKA (PC)</b>\n\n' +
    `Status Channel Gudang: <b>${wh ? 'Terhubung' : 'Belum Diatur (Isi WAREHOUSE_CHANNEL_ID)'}</b>\n\n` +
    '<b>1. Sistem Request Radio & Gudang Musik:</b>\n' +
    '• <code>/antrean</code> — Lihat semua list request (Link Spotify & File Gudang)\n' +
    '• <code>/req Judul | Link Spotify</code> — Request lagu via command\n' +
    '• <i>Kirim File Audio (MP3/M4A) ke PC bot</i> — Otomatis masuk Channel Gudang & antrean\n' +
    '• <code>/done 12</code> — Hapus request ID #12 setelah diputar di OS\n' +
    '• <code>/clearradio</code> — Kosongkan seluruh antrean lagu\n\n' +
    '<b>2. Pengaturan Greet (Member Masuk Grup):</b>\n' +
    '• <code>/setgreet teks baru</code> — Ubah teks sambutan\n' +
    '• <code>/setgreetmedia</code> — Reply GIF/Stiker di PC ini untuk pelengkap sambutan\n' +
    '• <code>/delgreetmedia</code> — Hapus GIF/Stiker sambutan\n\n' +
    '<b>3. Pengaturan Bye (Member Keluar Grup):</b>\n' +
    '• <code>/setbye teks baru</code> — Ubah teks perpisahan\n' +
    '• <code>/setbyemedia</code> — Reply GIF/Stiker di PC ini untuk pelengkap pesan keluar\n' +
    '• <code>/delbyemedia</code> — Hapus GIF/Stiker pesan keluar\n' +
    '• <code>/greetinfo</code> — Cek teks & status media Greet/Bye saat ini\n\n' +
    '<b>Variabel Otomatis Greet & Bye:</b>\n' +
    '<code>{name}</code> (Nama), <code>{mention}</code> (Tag), <code>{username}</code> (@user), <code>{count}</code> (Jumlah Member)'
  );
}

function renderGreetInfoText() {
  const greetText = getSetting('greet_text', DEFAULT_GREET);
  const byeText = getSetting('bye_text', DEFAULT_BYE);
  const greetMedia = getSetting('greet_media', '');
  const byeMedia = getSetting('bye_media', '');

  return (
    '<b>STATUS PENGATURAN GREET & BYE</b>\n\n' +
    `• Media Greet: <b>${greetMedia ? greetMedia.split(':')[0].toUpperCase() + ' Terpasang' : 'Kosong'}</b>\n` +
    `• Media Bye: <b>${byeMedia ? byeMedia.split(':')[0].toUpperCase() + ' Terpasang' : 'Kosong'}</b>\n\n` +
    `<b>Teks Greet Saat Ini:</b>\n<i>${escHtml(greetText)}</i>\n\n` +
    `<b>Teks Bye Saat Ini:</b>\n<i>${escHtml(byeText)}</i>`
  );
}

export function startBot() {
  if (!ENV.BOT_TOKEN) {
    console.warn('[PUNKSHIT.OS] BOT_TOKEN kosong, bot dilewati.');
    return null;
  }

  const bot = new Bot(ENV.BOT_TOKEN);
  botInstance = bot;

  // /start -> Menu Utama & Tombol Kamus di PC
  bot.command('start', async (ctx) => {
    const isPrivate = ctx.chat.type === 'private';
    const admin = isBotAdmin(ctx.from.id);

    if (isPrivate) {
      await ctx.reply(
        '<b>PUNKSHIT.OS — Pusat Kendali Bot</b>\n\n' +
        '• Warga: Kirim file musik (MP3/M4A) langsung ke chat ini untuk dimasukkan ke <b>Channel Gudang</b>, atau kirim link Spotify lewat tombol WebApp.\n' +
        '• Admin: Buka <b>Kamus Command Admin</b> di bawah untuk panduan lengkap.',
        {
          parse_mode: 'HTML',
          reply_markup: buildPrivateMenuKeyboard(admin)
        }
      );
    } else {
      const kb = new InlineKeyboard();
      if (ENV.MINIAPP_LINK) kb.url('Buka PUNKSHIT.OS', ENV.MINIAPP_LINK);
      await ctx.reply(
        '<b>PUNKSHIT.OS aktif di markas.</b> Gunakan tombol di bawah untuk membuka aplikasi.',
        { parse_mode: 'HTML', reply_markup: kb }
      );
    }
  });

  // /kamus -> Buka Kamus Command lengkap di PC
  bot.command('kamus', async (ctx) => {
    if (ctx.chat.type !== 'private') return;
    if (!isBotAdmin(ctx.from.id)) return ctx.reply('Akses ditolak. Khusus Owner & Admin.');

    const kb = new InlineKeyboard()
      .text('Status Greet & Bye', 'pc_greet_info')
      .text('Antrean Radio', 'pc_radio_queue');

    await ctx.reply(renderKamusText(), { parse_mode: 'HTML', reply_markup: kb });
  });

  // /req Judul Lagu | https://open.spotify.com/... -> Request lagu via command
  bot.command('req', async (ctx) => {
    const raw = String(ctx.match || '').trim();
    const parts = raw.split('|').map(s => s.trim());
    const song = (parts[0] || '').slice(0, 80);
    const link = (parts[1] || '').slice(0, 180);

    if (song.length < 3 || !/^https:\/\/open\.spotify\.com\//.test(link)) {
      return ctx.reply(
        'Format wajib menyertakan judul dan link Spotify:\n' +
        '<code>/req Judul Lagu - Artis | https://open.spotify.com/track/...</code>',
        { parse_mode: 'HTML' }
      );
    }

    const senderName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || 'Warga';
    const info = db.prepare(`
      INSERT INTO radio_queue (user_id, user_name, source_type, song, link, file_id, message, status, created_at)
      VALUES (?, ?, 'spotify', ?, ?, '', '', 'waiting', ?)
    `).run(String(ctx.from.id), senderName, song, link, Date.now());

    const reqId = info.lastInsertRowid;
    const warehouseId = getWarehouseId();

    if (warehouseId) {
      try {
        const kb = new InlineKeyboard().url('Buka di Spotify', link);
        await bot.api.sendMessage(
          warehouseId,
          `<b>REQUEST SPOTIFY #${reqId}</b>\n` +
          `Judul: <b>${escHtml(song)}</b>\n` +
          `Requester: <b>${escHtml(senderName)}</b>\n` +
          `Link: ${escHtml(link)}`,
          { parse_mode: 'HTML', reply_markup: kb }
        );
      } catch (e) {
        console.error('[Warehouse Spotify Error]:', e.message);
      }
    }

    await ctx.reply(`Request #${reqId} (<b>${escHtml(song)}</b>) berhasil masuk ke antrean & Channel Gudang.`, { parse_mode: 'HTML' });
  });

  // Warga kirim file audio/musik ke PC Bot -> Otomatis kirim ke Channel Gudang & masuk antrean
  bot.on(['message:audio', 'message:document'], async (ctx, next) => {
    if (ctx.chat.type !== 'private') return next();

    const audio = ctx.message.audio;
    const doc = ctx.message.document;
    const isAudioDoc = doc && doc.mime_type && doc.mime_type.startsWith('audio/');

    if (!audio && !isAudioDoc) return next();

    const warehouseId = getWarehouseId();
    if (!warehouseId) {
      return ctx.reply('Channel Gudang belum dikonfigurasi oleh admin (WAREHOUSE_CHANNEL_ID kosong).');
    }

    const fileId = audio ? audio.file_id : doc.file_id;
    const rawTitle =
      String(ctx.message.caption || '').trim() ||
      (audio && [audio.performer, audio.title].filter(Boolean).join(' - ')) ||
      (doc && doc.file_name) ||
      'Audio Request Warga';
    const song = rawTitle.slice(0, 80);
    const senderName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || 'Warga';

    const info = db.prepare(`
      INSERT INTO radio_queue (user_id, user_name, source_type, song, link, file_id, message, status, created_at)
      VALUES (?, ?, 'audio', ?, '', ?, '', 'waiting', ?)
    `).run(String(ctx.from.id), senderName, song, fileId, Date.now());

    const reqId = info.lastInsertRowid;

    try {
      await bot.api.sendAudio(warehouseId, fileId, {
        caption:
          `<b>GUDANG MUSIK — REQUEST #${reqId}</b>\n` +
          `Judul: <b>${escHtml(song)}</b>\n` +
          `Requester: <b>${escHtml(senderName)}</b>`,
        parse_mode: 'HTML'
      });

      if (ENV.GROUP_ID) {
        await bot.api.sendMessage(
          ENV.GROUP_ID,
          `<b>RADIO GANG — FILE MUSIK #${reqId}</b>\n` +
          `Requester: <b>${escHtml(senderName)}</b>\n` +
          `Track: <b>${escHtml(song)}</b>\n` +
          `File sudah tersimpan di <b>Channel Gudang</b> untuk diputar di OS.`,
          { parse_mode: 'HTML' }
        ).catch(() => {});
      }

      await ctx.reply(`File musik <b>${escHtml(song)}</b> berhasil dikirim ke Channel Gudang dengan nomor antrean <b>#${reqId}</b>.`, { parse_mode: 'HTML' });
    } catch (err) {
      console.error('[Warehouse Audio Error]:', err.message);
      await ctx.reply(`Gagal mengirim file ke Channel Gudang: ${err.message}`);
    }
  });

  // /antrean -> Cek daftar request lagu
  bot.command('antrean', async (ctx) => {
    const kb = new InlineKeyboard();
    if (ENV.MINIAPP_LINK) {
      kb.url('Request di WebApp', `${ENV.MINIAPP_LINK}?startapp=radio`);
    }
    if (isBotAdmin(ctx.from.id)) {
      kb.row().text('Refresh Antrean', 'pc_radio_queue').text('Kosongkan Semua', 'pc_radio_clear');
    }
    await ctx.reply(renderRadioQueueText(), {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: kb
    });
  });

  // /done <id> -> Tandai 1 request selesai diputar
  bot.command('done', async (ctx) => {
    if (!isBotAdmin(ctx.from.id)) return;
    const id = Number(String(ctx.match || '').trim().replace(/^#/, ''));
    if (!id) return ctx.reply('Format: /done <nomor_id>\nContoh: /done 3');

    const info = db.prepare("UPDATE radio_queue SET status = 'played' WHERE id = ? AND status = 'waiting'").run(id);
    if (!info.changes) {
      return ctx.reply(`Request ID #${id} tidak ditemukan atau sudah selesai.`);
    }
    await ctx.reply(`Request ID #${id} ditandai selesai diputar dan dihapus dari antrean.`);
  });

  // /clearradio -> Kosongkan seluruh antrean
  bot.command('clearradio', async (ctx) => {
    if (!isBotAdmin(ctx.from.id)) return;
    db.prepare("UPDATE radio_queue SET status = 'played' WHERE status = 'waiting'").run();
    await ctx.reply('Semua antrean request Radio Gang berhasil dikosongkan.');
  });

  // /greetinfo -> Cek status Greet & Bye di PC
  bot.command('greetinfo', async (ctx) => {
    if (ctx.chat.type !== 'private') return;
    if (!isBotAdmin(ctx.from.id)) return ctx.reply('Akses ditolak. Khusus Owner & Admin.');

    const kb = new InlineKeyboard().text('Buka Kamus Command', 'pc_kamus');
    await ctx.reply(renderGreetInfoText(), { parse_mode: 'HTML', reply_markup: kb });
  });

  // /setgreet <teks>
  bot.command('setgreet', async (ctx) => {
    if (ctx.chat.type !== 'private' || !isBotAdmin(ctx.from.id)) return;
    const text = String(ctx.match || '').trim();
    if (text.length < 3) {
      return ctx.reply('Format: /setgreet Selamat datang {mention} di markas.');
    }
    setSetting('greet_text', text);
    await ctx.reply('Teks Greet (sambutan member masuk) berhasil disimpan.');
  });

  // /setbye <teks>
  bot.command('setbye', async (ctx) => {
    if (ctx.chat.type !== 'private' || !isBotAdmin(ctx.from.id)) return;
    const text = String(ctx.match || '').trim();
    if (text.length < 3) {
      return ctx.reply('Format: /setbye {name} telah keluar dari markas.');
    }
    setSetting('bye_text', text);
    await ctx.reply('Teks Bye (member keluar) berhasil disimpan.');
  });

  // /setgreetmedia (Reply GIF/Stiker di PC)
  bot.command('setgreetmedia', async (ctx) => {
    if (ctx.chat.type !== 'private' || !isBotAdmin(ctx.from.id)) return;
    const reply = ctx.message?.reply_to_message;
    if (!reply) {
      return ctx.reply('Reply (balas) GIF atau Stiker di chat ini dengan perintah /setgreetmedia');
    }
    if (reply.animation) {
      setSetting('greet_media', `animation:${reply.animation.file_id}`);
      return ctx.reply('GIF berhasil dipasang untuk sambutan Greet grup.');
    }
    if (reply.sticker) {
      setSetting('greet_media', `sticker:${reply.sticker.file_id}`);
      return ctx.reply('Stiker berhasil dipasang untuk sambutan Greet grup.');
    }
    await ctx.reply('Hanya mendukung reply berupa GIF atau Stiker.');
  });

  // /setbyemedia (Reply GIF/Stiker di PC)
  bot.command('setbyemedia', async (ctx) => {
    if (ctx.chat.type !== 'private' || !isBotAdmin(ctx.from.id)) return;
    const reply = ctx.message?.reply_to_message;
    if (!reply) {
      return ctx.reply('Reply (balas) GIF atau Stiker di chat ini dengan perintah /setbyemedia');
    }
    if (reply.animation) {
      setSetting('bye_media', `animation:${reply.animation.file_id}`);
      return ctx.reply('GIF berhasil dipasang untuk pesan Bye grup.');
    }
    if (reply.sticker) {
      setSetting('bye_media', `sticker:${reply.sticker.file_id}`);
      return ctx.reply('Stiker berhasil dipasang untuk pesan Bye grup.');
    }
    await ctx.reply('Hanya mendukung reply berupa GIF atau Stiker.');
  });

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

  // Handler Tombol Inline di PC Bot
  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;
    const admin = isBotAdmin(ctx.from.id);

    if (data === 'pc_kamus') {
      if (!admin) return ctx.answerCallbackQuery({ text: 'Khusus Owner & Admin.', show_alert: true });
      const kb = new InlineKeyboard()
        .text('Status Greet & Bye', 'pc_greet_info')
        .text('Antrean Radio', 'pc_radio_queue');
      await ctx.editMessageText(renderKamusText(), { parse_mode: 'HTML', reply_markup: kb }).catch(() => {});
      return ctx.answerCallbackQuery();
    }

    if (data === 'pc_greet_info') {
      if (!admin) return ctx.answerCallbackQuery({ text: 'Khusus Owner & Admin.', show_alert: true });
      const kb = new InlineKeyboard()
        .text('Kamus Command', 'pc_kamus')
        .text('Antrean Radio', 'pc_radio_queue');
      await ctx.editMessageText(renderGreetInfoText(), { parse_mode: 'HTML', reply_markup: kb }).catch(() => {});
      return ctx.answerCallbackQuery();
    }

    if (data === 'pc_radio_queue') {
      const kb = new InlineKeyboard().text('Refresh Antrean', 'pc_radio_queue');
      if (admin) {
        kb.text('Kosongkan Semua', 'pc_radio_clear');
        kb.row().text('Kamus Command', 'pc_kamus');
      }
      await ctx.editMessageText(renderRadioQueueText(), {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: kb
      }).catch(() => {});
      return ctx.answerCallbackQuery({ text: 'Antrean diperbarui.' });
    }

    if (data === 'pc_radio_clear') {
      if (!admin) return ctx.answerCallbackQuery({ text: 'Khusus Owner & Admin.', show_alert: true });
      db.prepare("UPDATE radio_queue SET status = 'played' WHERE status = 'waiting'").run();
      const kb = new InlineKeyboard().text('Refresh Antrean', 'pc_radio_queue').text('Kamus Command', 'pc_kamus');
      await ctx.editMessageText(renderRadioQueueText(), {
        parse_mode: 'HTML',
        reply_markup: kb
      }).catch(() => {});
      return ctx.answerCallbackQuery({ text: 'Antrean dikosongkan.' });
    }

    await ctx.answerCallbackQuery();
  });

  // Event Member Baru Masuk Grup
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
        if (mediaRaw.startsWith('animation:')) {
          await ctx.replyWithAnimation(mediaRaw.slice(10), { caption: body, parse_mode: 'HTML', reply_markup: kb });
        } else if (mediaRaw.startsWith('sticker:')) {
          await ctx.replyWithSticker(mediaRaw.slice(8));
          await ctx.reply(body, { parse_mode: 'HTML', reply_markup: kb, disable_web_page_preview: true });
        } else {
          await ctx.reply(body, { parse_mode: 'HTML', reply_markup: kb, disable_web_page_preview: true });
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
    try { count = await ctx.getChatMemberCount(); } catch (e) {}

    const tpl = getSetting('bye_text', DEFAULT_BYE);
    const mediaRaw = getSetting('bye_media', '');
    const kb = buildByeKeyboard();
    const body = formatTemplate(tpl, m, count);

    try {
      if (mediaRaw.startsWith('animation:')) {
        await ctx.replyWithAnimation(mediaRaw.slice(10), { caption: body, parse_mode: 'HTML', reply_markup: kb });
      } else if (mediaRaw.startsWith('sticker:')) {
        await ctx.replyWithSticker(mediaRaw.slice(8));
        await ctx.reply(body, { parse_mode: 'HTML', reply_markup: kb, disable_web_page_preview: true });
      } else {
        await ctx.reply(body, { parse_mode: 'HTML', reply_markup: kb, disable_web_page_preview: true });
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
