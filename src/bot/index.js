import { Bot, InlineKeyboard } from 'grammy';
import { ENV } from '../config/env.js';
import { db } from '../database/db.js';
import { escHtml, bindBotInstance } from '../services/syncEngine.js';

let botInstance = null;

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
  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id TEXT NOT NULL,
    action TEXT NOT NULL,
    detail TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
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

try { db.exec("ALTER TABLE radio_queue ADD COLUMN source_type TEXT DEFAULT 'spotify'"); } catch (e) {}
try { db.exec("ALTER TABLE radio_queue ADD COLUMN file_id TEXT DEFAULT ''"); } catch (e) {}

const SPARK_MIN_GAP = Number(process.env.SPARK_MIN_GAP || 5);
const SPARK_MIN_MSG = Number(process.env.SPARK_MIN_MSG || 2);
const SPARK_GAP_COOLDOWN = Number(process.env.SPARK_GAP_COOLDOWN || 30);

function todayWib() {
  const now = new Date(Date.now() + 7 * 3600 * 1000);
  return now.toISOString().slice(0, 10);
}

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

function logAudit(actorId, action, detail) {
  try {
    db.prepare('INSERT INTO audit_logs (actor_id, action, detail, created_at) VALUES (?, ?, ?, ?)')
      .run(String(actorId), action, detail, Date.now());
  } catch (e) {}
}

const DEFAULT_GREET =
  'Wih, ada nyawa baru nyasar ke markas. Selamat datang, {mention}.\n\n' +
  'Cetak PunkID lo dulu biar sah jadi warga, terus baca Pasal & Help biar kaga salah tingkah di tongkrongan. Warga ke-{count} resmi tercatat.';

const DEFAULT_BYE =
  'Yah, {name} ({username}) cabut dari markas.\n\n' +
  'Yaudah deh, akses PunkID resmi ditutup. Sisa warga di tongkrongan sekarang {count} orang.';

const DEFAULT_PASAL =
  '<b>PASAL & ATURAN TONGKRONGAN</b>\n\n' +
  '1. Saling hargai sesama warga markas.\n' +
  '2. Dilarang spam link judi, scam, atau SARA.\n' +
  '3. Kalau mau nitip lagu pas OS, pake fitur Radio Gang dengan tertib.\n' +
  '4. Langgar aturan? Siap-siap disidang warga.';

const DEFAULT_HELP =
  '<b>PUSAT BANTUAN (HELP)</b>\n\n' +
  '• <b>Cetak PunkID:</b> Buka Mini App lewat tombol utama.\n' +
  '• <b>Nitip Lagu OS:</b> Kirim link Spotify lewat Mini App atau lempar file MP3 langsung ke PC Mas Raka.\n' +
  '• <b>Butuh Bantuan Lain?</b> Pantau info terbaru di channel utama.';

function isBotAdmin(userId) {
  const uid = String(userId);
  if ((ENV.OWNER_IDS || []).map(String).includes(uid)) return true;
  const u = db.prepare('SELECT role FROM users WHERE id = ?').get(uid);
  return Boolean(u && (u.role === 'owner' || u.role === 'admin' || u.role === 'moderator'));
}

function isBotOwnerOrAdmin(userId) {
  const uid = String(userId);
  if ((ENV.OWNER_IDS || []).map(String).includes(uid)) return true;
  const u = db.prepare('SELECT role FROM users WHERE id = ?').get(uid);
  return Boolean(u && (u.role === 'owner' || u.role === 'admin'));
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
    kb.url('Cek Daftar Warga', `${appLink}?startapp=warga`);
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

function renderPrivateHomeText(userId) {
  const roleTag = isBotAdmin(userId) ? 'PENGURUS MARKAS' : 'WARGA MARKAS';
  return (
    '🪪 <b>PUNKSHIT.OS — MARKAS ONLINE</b>\n' +
    `Status Akses: <code>${roleTag}</code>\n\n` +
    'Wih, nongol juga. Markas masih berdiri kok, belum dialihfungsikan jadi minimarket.\n\n' +
    '<blockquote>' +
    '<b>Cara Nitip Lagu OS:</b>\n' +
    '• Kirim file musik (<b>MP3 / M4A</b>) langsung ke chat ini buat masuk Gudang.\n' +
    '• Atau kirim link <b>Spotify</b> lewat menu Radio Gang di Mini App.' +
    '</blockquote>\n' +
    'Pilih menu navigasi di bawah:'
  );
}

function buildPrivateMenuKeyboard() {
  const kb = new InlineKeyboard();

  if (ENV.MINIAPP_LINK) {
    kb.url('🪪 Buka Mini App PUNKSHIT.OS', ENV.MINIAPP_LINK);
  }

  const groupUrl = (process.env.GROUP_URL || '').trim();
  kb.row();
  if (groupUrl) {
    kb.url('💬 Grup Markas', groupUrl);
  }
  kb.text('📻 Antrean Radio', 'pc_radio_queue');

  kb.row()
    .text('📖 Kamus Command', 'pc_kamus')
    .text('⚙️ Command Admin', 'pc_admin_cmd');

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
      '📻 <b>ANTREAN RADIO GANG (OS)</b>\n\n' +
      'Masih sepi nih, belum ada yang nitip lagu buat OS.\n\n' +
      '<blockquote>' +
      '<b>Cara Nitip Lagu:</b>\n' +
      '• <b>Spotify:</b> Ketik <code>/req Judul - Artis | https://open.spotify.com/...</code>\n' +
      '• <b>File Audio:</b> Kirim langsung file MP3/M4A ke PC ini.' +
      '</blockquote>'
    );
  }

  const lines = list.map((item, idx) => {
    const badge = item.source_type === 'audio' ? '[GUDANG]' : '[SPOTIFY]';
    const linkPart = item.link ? `\n   🔗 ${escHtml(item.link)}` : '';
    const msgPart = item.message ? `\n   💬 <i>"${escHtml(item.message)}"</i>` : '';
    return `<b>${idx + 1}. #${item.id} ${badge} ${escHtml(item.song)}</b>\n   👤 ${escHtml(item.user_name)}${linkPart}${msgPart}`;
  });

  return (
    `📻 <b>ANTREAN RADIO GANG (${list.length} Lagu)</b>\n\n` +
    lines.join('\n\n') +
    '\n\n<i>Admin: ketik /done <ID> kalau lagunya udah kelar diputer.</i>'
  );
}

function renderKamusText() {
  return (
    '📖 <b>KAMUS COMMAND MAS RAKA</b>\n\n' +
    '<b>1. Perintah Warga, Spark & Radio:</b>\n' +
    '• <code>/start</code> — Buka menu utama markas\n' +
    '• <code>/spark</code> — Buka Spark Buddies\n' +
    '• <code>/acc</code> — Terima ajakan Spark Buddies yang masuk\n' +
    '• <code>/antrean</code> — Cek daftar titipan lagu OS\n' +
    '• <code>/req Judul | Link</code> — Nitip lagu Spotify\n' +
    '• <code>/pasal</code> — Baca pasal & aturan tongkrongan\n' +
    '• <code>/help</code> — Pusat bantuan warga\n' +
    '• <code>/myid</code> — Cek Telegram ID akun kamu\n\n' +
    '<b>2. Top Up / Give Koin PSC & Role (Admin/Owner):</b>\n' +
    '• <code>/givepsc @username 500</code> — Kirim/top up koin PSC\n' +
    '• <code>/givepsc 500</code> — Reply pesan warga di grup untuk give koin\n' +
    '• <code>/givepsc @username -200</code> — Potong koin PSC warga\n' +
    '• <code>/cekpsc @username</code> — Cek saldo & role warga\n' +
    '• <code>/setrole @username admin</code> — Atur role (admin/moderator/member)'
  );
}

function renderAdminCmdText() {
  const wh = getWarehouseId();
  const greetMedia = getSetting('greet_media', '');
  const byeMedia = getSetting('bye_media', '');

  return (
    '⚙️ <b>COMMAND ADMIN — EKONOMI, GREET & SYSTEM</b>\n\n' +
    '<blockquote>' +
    `• Grup ID: <code>${escHtml(ENV.GROUP_ID || 'Kosong')}</code>\n` +
    `• Channel ID: <code>${escHtml(ENV.CHANNEL_ID || 'Kosong')}</code>\n` +
    `• Gudang Musik: <b>${wh ? 'Terhubung' : 'Belum Diset'}</b>\n` +
    `• Media Greet: <b>${greetMedia ? greetMedia.split(':')[0].toUpperCase() : 'Kosong'}</b> | Bye: <b>${byeMedia ? byeMedia.split(':')[0].toUpperCase() : 'Kosong'}</b>` +
    '</blockquote>\n\n' +
    '<b>Top Up / Give Koin & Radio:</b>\n' +
    '• <code>/givepsc @user 500</code> (atau reply chat + nominal)\n' +
    '• <code>/cekpsc @user</code> — Cek saldo warga\n' +
    '• <code>/done 12</code> | <code>/clearradio</code> — Kelola antrean lagu\n\n' +
    '<b>Atur Sambutan Masuk (Greet) & Keluar (Bye):</b>\n' +
    '• <code>/setgreet teks baru</code> | <code>/setbye teks baru</code>\n' +
    '• <code>/setgreetmedia</code> | <code>/setbyemedia</code> (reply GIF/Stiker)\n' +
    '• <code>/delgreetmedia</code> | <code>/delbyemedia</code>\n' +
    '• <code>/setpasal teks</code> | <code>/sethelp teks</code>'
  );
}

function renderGreetInfoText() {
  const greetText = getSetting('greet_text', DEFAULT_GREET);
  const byeText = getSetting('bye_text', DEFAULT_BYE);
  return (
    '📝 <b>TEKS GREET & BYE AKTIF</b>\n\n' +
    `<b>Teks Greet:</b>\n<blockquote>${escHtml(greetText)}</blockquote>\n\n` +
    `<b>Teks Bye:</b>\n<blockquote>${escHtml(byeText)}</blockquote>`
  );
}

export function startBot() {
  if (!ENV.BOT_TOKEN) {
    console.warn('[PUNKSHIT.OS] BOT_TOKEN kosong, bot dilewati.');
    return null;
  }

  const bot = new Bot(ENV.BOT_TOKEN);
  botInstance = bot;
  bindBotInstance(bot);

  bot.api.setMyCommands([
    { command: 'start', description: 'Menu Utama Markas PUNKSHIT.OS' },
    { command: 'spark', description: 'Buka Spark Buddies' },
    { command: 'acc', description: 'Terima Ajakan Spark Buddies' },
    { command: 'givepsc', description: 'Give / Top Up Koin PSC Warga (Admin)' },
    { command: 'cekpsc', description: 'Cek Saldo PSC Warga' },
    { command: 'antrean', description: 'Cek Antrean Lagu Radio Gang' },
    { command: 'req', description: 'Titip Lagu Spotify (/req Judul | Link)' },
    { command: 'pasal', description: 'Pasal & Aturan Tongkrongan' },
    { command: 'help', description: 'Pusat Bantuan Warga' },
    { command: 'kamus', description: 'Kamus Command Lengkap' },
    { command: 'myid', description: 'Cek Telegram ID Kamu' }
  ]).catch(() => {});

  // === TRACKER SPARK BUDDIES DI GRUP (5 GAP + 2 PESAN) ===
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
              db.prepare(`
                UPDATE spark_pairs
                SET streak = ?, xp = ?, last_qualified_date = ?
                WHERE id = ?
              `).run(newStreak, newXp, today, pair.id);

              await ctx.reply(
                `🔥 <b>SPARK SECURED!</b>\n` +
                `@${escHtml(usn)} x @${escHtml(partner)} sudah aktif bareng hari ini!\n` +
                `Streak: <b>${newStreak} Hari</b> · Total XP: <b>${newXp}</b>`,
                { parse_mode: 'HTML' }
              ).catch(() => {});
            }
          }
        }
      }
    } catch (e) {
      console.error('[Spark Tracker Error]:', e.message);
    }
    return next();
  });

  // === COMMAND /spark & /acc ===
  bot.command('spark', async (ctx) => {
    const kb = new InlineKeyboard();
    if (ENV.MINIAPP_LINK) {
      kb.url('🔥 Buka Spark Buddies', `${ENV.MINIAPP_LINK}?startapp=spark`);
    }
    await ctx.reply(
      '🔥 <b>SPARK BUDDIES</b>\n' +
      'Nyalain api bareng partner markas kamu! Tap tombol di bawah:',
      { parse_mode: 'HTML', reply_markup: kb }
    );
  });

  bot.command('acc', async (ctx) => {
    const usn = (ctx.from?.username || '').toLowerCase();
    if (!usn) {
      return ctx.reply('Pasang @username Telegram dulu sebelum pakai Spark Buddies.');
    }

    const row = db.prepare(`
      SELECT id, user1 FROM spark_pairs
      WHERE user2 = ? AND status = 'pending'
      ORDER BY id DESC LIMIT 1
    `).get(usn);

    if (!row) {
      return ctx.reply('Nggak ada ajakan Spark yang masuk buat kamu saat ini.');
    }

    db.prepare("UPDATE spark_pairs SET status = 'paired' WHERE id = ?").run(row.id);
    await ctx.reply(
      `🔥 <b>SPARK RESMI MENYALA!</b>\n` +
      `@${escHtml(row.user1)} x @${escHtml(usn)} sekarang resmi jadi Spark Buddies!`,
      { parse_mode: 'HTML' }
    );
  });

  bot.command('start', async (ctx) => {
    if (ctx.chat.type === 'private') {
      await ctx.reply(renderPrivateHomeText(ctx.from.id), {
        parse_mode: 'HTML',
        reply_markup: buildPrivateMenuKeyboard()
      });
    } else {
      const kb = new InlineKeyboard();
      if (ENV.MINIAPP_LINK) kb.url('🪪 Buka PUNKSHIT.OS', ENV.MINIAPP_LINK);
      await ctx.reply(
        '🪪 <b>PUNKSHIT.OS — MARKAS ONLINE</b>\n' +
        'Wih, nongol juga. Tap tombol di bawah buat buka Mini App:',
        { parse_mode: 'HTML', reply_markup: kb }
      );
    }
  });

  bot.command('myid', async (ctx) => {
    await ctx.reply(`🆔 Telegram ID kamu: <code>${ctx.from.id}</code>`, { parse_mode: 'HTML' });
  });

  bot.command('givepsc', async (ctx) => {
    if (!isBotOwnerOrAdmin(ctx.from.id)) {
      return ctx.reply('⛔ Khusus Owner & Admin doang yang bisa suntik koin PSC cuy.');
    }

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
      return ctx.reply(
        'Format Give / Top Up PSC:\n' +
        '• <code>/givepsc @username 500</code>\n' +
        '• <code>/givepsc 123456789 500</code>\n' +
        '• Atau <b>reply pesan warga</b> di grup lalu ketik <code>/givepsc 500</code>\n' +
        '<i>(Gunakan angka minus seperti -200 untuk memotong saldo)</i>',
        { parse_mode: 'HTML' }
      );
    }

    if (!amount || Number.isNaN(amount)) {
      return ctx.reply('Nominal koin PSC harus berupa angka valid (tidak boleh 0).');
    }

    if (!targetUser) {
      return ctx.reply('Warga belum terdaftar di database PunkID. Suruh cetak PunkID dulu di Mini App!');
    }

    db.prepare('UPDATE users SET psc = MAX(0, psc + ?) WHERE id = ?').run(amount, targetUser.id);
    const updated = db.prepare('SELECT psc FROM users WHERE id = ?').get(targetUser.id);

    logAudit(ctx.from.id, 'GIVE PSC (BOT)', `${amount > 0 ? '+' : ''}${amount} PSC ke ${targetUser.name} (${reason})`);

    const sign = amount > 0 ? `+${amount}` : `${amount}`;
    await ctx.reply(
      `💰 <b>TRANSAKSI PSC BERHASIL</b>\n\n` +
      `• Penerima: <b>${escHtml(targetUser.name)}</b> ${targetUser.username ? `(@${escHtml(targetUser.username)})` : ''}\n` +
      `• Nominal: <b>${sign} PSC</b>\n` +
      `• Saldo Sekarang: <b>${updated.psc} PSC</b>\n` +
      `• Keterangan: <i>${escHtml(reason)}</i>`,
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

    if (!targetUser) {
      return ctx.reply('Data warga belum ditemukan di PunkID.');
    }

    await ctx.reply(
      `💳 <b>DOMPET WARGA — ${escHtml(targetUser.name)}</b>\n` +
      `• ID Warga: <code>${escHtml(targetUser.member_no || targetUser.id)}</code>\n` +
      `• Role: <code>${escHtml((targetUser.role || 'member').toUpperCase())}</code>\n` +
      `• Saldo PSC: <b>${targetUser.psc || 0} PSC</b>\n` +
      `• Street Cred: <b>${targetUser.cred || 0}</b>`,
      { parse_mode: 'HTML' }
    );
  });

  bot.command('setrole', async (ctx) => {
    const senderId = String(ctx.from.id);
    const isOwner = (ENV.OWNER_IDS || []).map(String).includes(senderId);
    if (!isOwner) {
      return ctx.reply('⛔ Khusus Owner utama (OWNER_IDS) yang bisa ubah role pengurus.');
    }

    const args = String(ctx.match || '').trim().split(/\s+/).filter(Boolean);
    if (args.length < 2) {
      return ctx.reply('Format: <code>/setrole @username admin</code>\nPilihan role: <code>admin</code>, <code>moderator</code>, <code>member</code>', { parse_mode: 'HTML' });
    }

    const rawTarget = args[0].replace(/^@/, '');
    const role = args[1].toLowerCase();
    if (!['admin', 'moderator', 'member'].includes(role)) {
      return ctx.reply('Role cuma boleh: admin, moderator, atau member.');
    }

    const targetUser = db.prepare('SELECT * FROM users WHERE id = ? OR LOWER(username) = LOWER(?)').get(rawTarget, rawTarget);
    if (!targetUser) return ctx.reply('Warga kaga ketemu di database PunkID.');

    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, targetUser.id);
    logAudit(senderId, 'SET ROLE (BOT)', `${targetUser.name} -> ${role}`);

    await ctx.reply(`✅ Role <b>${escHtml(targetUser.name)}</b> resmi diubah menjadi <b>${role.toUpperCase()}</b>.`, { parse_mode: 'HTML' });
  });

  bot.command('kamus', async (ctx) => {
    if (ctx.chat.type !== 'private') return;
    const kb = new InlineKeyboard()
      .text('⚙️ Command Admin', 'pc_admin_cmd')
      .text('📻 Antrean Radio', 'pc_radio_queue')
      .row()
      .text('« Kembali ke Menu', 'pc_home');
    await ctx.reply(renderKamusText(), { parse_mode: 'HTML', reply_markup: kb });
  });

  bot.command('pasal', async (ctx) => {
    await ctx.reply(getSetting('pasal_text', DEFAULT_PASAL), { parse_mode: 'HTML' });
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(getSetting('help_text', DEFAULT_HELP), { parse_mode: 'HTML' });
  });

  bot.command('setpasal', async (ctx) => {
    if (ctx.chat.type !== 'private' || !isBotAdmin(ctx.from.id)) return;
    const text = String(ctx.match || '').trim();
    if (text.length < 5) return ctx.reply('Format: /setpasal 1. Dilarang rusuh... (minimal 5 karakter)');
    setSetting('pasal_text', text);
    await ctx.reply('✅ Sip, teks Pasal & Aturan tongkrongan berhasil di-update.');
  });

  bot.command('sethelp', async (ctx) => {
    if (ctx.chat.type !== 'private' || !isBotAdmin(ctx.from.id)) return;
    const text = String(ctx.match || '').trim();
    if (text.length < 5) return ctx.reply('Format: /sethelp • Cara pakai bot... (minimal 5 karakter)');
    setSetting('help_text', text);
    await ctx.reply('✅ Sip, teks Pusat Bantuan (Help) berhasil di-update.');
  });

  bot.command('req', async (ctx) => {
    const raw = String(ctx.match || '').trim();
    const parts = raw.split('|').map((s) => s.trim());
    const song = (parts[0] || '').slice(0, 80);
    const link = (parts[1] || '').slice(0, 180);

    if (song.length < 3 || !/^https:\/\/open\.spotify\.com\//.test(link)) {
      return ctx.reply(
        'Sertakan judul sama link Spotify-nya sekalian cuy:\n' +
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
          `Dari: <b>${escHtml(senderName)}</b>\n` +
          `Link: ${escHtml(link)}`,
          { parse_mode: 'HTML', reply_markup: kb }
        );
      } catch (e) {
        console.error('[Warehouse Spotify Error]:', e.message);
      }
    }

    await ctx.reply(`✅ Sip, request #${reqId} (<b>${escHtml(song)}</b>) udah masuk antrean & Gudang.`, { parse_mode: 'HTML' });
  });

  bot.on(['message:audio', 'message:document'], async (ctx, next) => {
    if (ctx.chat.type !== 'private') return next();

    const audio = ctx.message.audio;
    const doc = ctx.message.document;
    const isAudioDoc = doc && doc.mime_type && doc.mime_type.startsWith('audio/');

    if (!audio && !isAudioDoc) return next();

    const warehouseId = getWarehouseId();
    if (!warehouseId) {
      return ctx.reply('Channel Gudang belum diset sama admin (WAREHOUSE_CHANNEL_ID masih kosong).');
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
          `Dari: <b>${escHtml(senderName)}</b>`,
        parse_mode: 'HTML'
      });

      if (ENV.GROUP_ID) {
        await bot.api.sendMessage(
          ENV.GROUP_ID,
          `<b>RADIO GANG — FILE MUSIK #${reqId}</b>\n` +
          `Dari: <b>${escHtml(senderName)}</b>\n` +
          `Track: <b>${escHtml(song)}</b>\n` +
          `File udah gua lempar ke <b>Gudang Musik</b> buat diputer pas OS.`,
          { parse_mode: 'HTML' }
        ).catch(() => {});
      }

      await ctx.reply(`✅ Mantap, file <b>${escHtml(song)}</b> udah masuk Gudang Musik di antrean <b>#${reqId}</b>.`, { parse_mode: 'HTML' });
    } catch (err) {
      console.error('[Warehouse Audio Error]:', err.message);
      await ctx.reply(`Gagal kirim file ke Gudang: ${err.message}`);
    }
  });

  bot.command('antrean', async (ctx) => {
    const kb = new InlineKeyboard();
    if (ENV.MINIAPP_LINK) {
      kb.url('Nitip Lagu di Mini App', `${ENV.MINIAPP_LINK}?startapp=radio`);
    }
    if (isBotAdmin(ctx.from.id)) {
      kb.row().text('🔄 Refresh', 'pc_radio_queue').text('🗑️ Kosongkan', 'pc_radio_clear');
    }
    if (ctx.chat.type === 'private') {
      kb.row().text('« Kembali ke Menu', 'pc_home');
    }
    await ctx.reply(renderRadioQueueText(), {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: kb
    });
  });

  bot.command('done', async (ctx) => {
    if (!isBotAdmin(ctx.from.id)) return;
    const id = Number(String(ctx.match || '').trim().replace(/^#/, ''));
    if (!id) return ctx.reply('Format: /done <nomor_id>\nContoh: /done 3');

    const info = db.prepare("UPDATE radio_queue SET status = 'played' WHERE id = ? AND status = 'waiting'").run(id);
    if (!info.changes) {
      return ctx.reply(`Request ID #${id} kaga ketemu atau emang udah kelar.`);
    }
    await ctx.reply(`✅ Sip, request ID #${id} udah dicoret dari antrean.`);
  });

  bot.command('clearradio', async (ctx) => {
    if (!isBotAdmin(ctx.from.id)) return;
    db.prepare("UPDATE radio_queue SET status = 'played' WHERE status = 'waiting'").run();
    await ctx.reply('✅ Beres, semua antrean Radio Gang udah dikosongin.');
  });

  bot.command('greetinfo', async (ctx) => {
    if (ctx.chat.type !== 'private') return;
    if (!isBotAdmin(ctx.from.id)) return ctx.reply('Khusus Owner & Admin doang cuy.');

    const kb = new InlineKeyboard()
      .text('⚙️ Command Admin', 'pc_admin_cmd')
      .row()
      .text('« Kembali ke Menu', 'pc_home');
    await ctx.reply(renderGreetInfoText(), { parse_mode: 'HTML', reply_markup: kb });
  });

  bot.command('setgreet', async (ctx) => {
    if (ctx.chat.type !== 'private' || !isBotAdmin(ctx.from.id)) return;
    const text = String(ctx.match || '').trim();
    if (text.length < 3) {
      return ctx.reply('Format: /setgreet Wih ada warga baru, selamat datang {mention} di markas.');
    }
    setSetting('greet_text', text);
    await ctx.reply('✅ Sip, teks Greet buat warga masuk udah diganti.');
  });

  bot.command('setbye', async (ctx) => {
    if (ctx.chat.type !== 'private' || !isBotAdmin(ctx.from.id)) return;
    const text = String(ctx.match || '').trim();
    if (text.length < 3) {
      return ctx.reply('Format: /setbye Yah {name} cabut dari markas.');
    }
    setSetting('bye_text', text);
    await ctx.reply('✅ Sip, teks Bye buat warga keluar udah diganti.');
  });

  bot.command('setgreetmedia', async (ctx) => {
    if (ctx.chat.type !== 'private' || !isBotAdmin(ctx.from.id)) return;
    const reply = ctx.message?.reply_to_message;
    if (!reply) {
      return ctx.reply('Reply GIF atau Stiker di chat ini pake perintah /setgreetmedia cuy.');
    }
    if (reply.animation) {
      setSetting('greet_media', `animation:${reply.animation.file_id}`);
      return ctx.reply('✅ Mantap, GIF udah dipasang buat greet warga masuk.');
    }
    if (reply.sticker) {
      setSetting('greet_media', `sticker:${reply.sticker.file_id}`);
      return ctx.reply('✅ Mantap, Stiker udah dipasang buat greet warga masuk.');
    }
    await ctx.reply('Cuma bisa reply GIF atau Stiker doang cuy.');
  });

  bot.command('setbyemedia', async (ctx) => {
    if (ctx.chat.type !== 'private' || !isBotAdmin(ctx.from.id)) return;
    const reply = ctx.message?.reply_to_message;
    if (!reply) {
      return ctx.reply('Reply GIF atau Stiker di chat ini pake perintah /setbyemedia cuy.');
    }
    if (reply.animation) {
      setSetting('bye_media', `animation:${reply.animation.file_id}`);
      return ctx.reply('✅ Mantap, GIF udah dipasang buat pesan warga keluar.');
    }
    if (reply.sticker) {
      setSetting('bye_media', `sticker:${reply.sticker.file_id}`);
      return ctx.reply('✅ Mantap, Stiker udah dipasang buat pesan warga keluar.');
    }
    await ctx.reply('Cuma bisa reply GIF atau Stiker doang cuy.');
  });

  bot.command('delgreetmedia', async (ctx) => {
    if (ctx.chat.type !== 'private' || !isBotAdmin(ctx.from.id)) return;
    setSetting('greet_media', '');
    await ctx.reply('✅ GIF/Stiker Greet udah dicopot.');
  });

  bot.command('delbyemedia', async (ctx) => {
    if (ctx.chat.type !== 'private' || !isBotAdmin(ctx.from.id)) return;
    setSetting('bye_media', '');
    await ctx.reply('✅ GIF/Stiker Bye udah dicopot.');
  });

  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;
    const admin = isBotAdmin(ctx.from.id);

    // === TOMBOL ACC / TOLAK SPARK BUDDIES ===
    if (data.startsWith('spark_acc:') || data.startsWith('spark_dec:')) {
      const parts = data.split(':');
      const mode = parts[0];
      const sender = (parts[1] || '').toLowerCase();
      const target = (parts[2] || '').toLowerCase();
      const clicker = (ctx.from?.username || '').toLowerCase();

      if (!clicker || clicker !== target) {
        return ctx.answerCallbackQuery({
          text: `Cuma @${target} yang bisa pencet tombol ini!`,
          show_alert: true
        });
      }

      if (mode === 'spark_acc') {
        const row = db.prepare(`
          SELECT id FROM spark_pairs WHERE user1 = ? AND user2 = ? AND status = 'pending'
        `).get(sender, clicker);

        if (!row) {
          return ctx.answerCallbackQuery({ text: 'Ajakan sudah kadaluarsa atau dibatalkan.', show_alert: true });
        }

        db.prepare("UPDATE spark_pairs SET status = 'paired' WHERE id = ?").run(row.id);
        await ctx.editMessageText(
          `🔥 <b>SPARK RESMI MENYALA!</b>\n` +
          `@${escHtml(sender)} x @${escHtml(clicker)} sekarang resmi jadi Spark Buddies!`,
          { parse_mode: 'HTML' }
        ).catch(() => {});
        return ctx.answerCallbackQuery({ text: 'Spark resmi menyala! 🔥' });
      } else {
        db.prepare(`
          DELETE FROM spark_pairs
          WHERE (user1 = ? AND user2 = ?) OR (user1 = ? AND user2 = ?)
        `).run(sender, clicker, clicker, sender);
        await ctx.editMessageText(
          `💨 Ajakan Spark dari @${escHtml(sender)} ke @${escHtml(clicker)} ditolak.`,
          { parse_mode: 'HTML' }
        ).catch(() => {});
        return ctx.answerCallbackQuery({ text: 'Ajakan ditolak.' });
      }
    }

    if (data === 'pc_home') {
      await ctx.editMessageText(renderPrivateHomeText(ctx.from.id), {
        parse_mode: 'HTML',
        reply_markup: buildPrivateMenuKeyboard()
      }).catch(() => {});
      return ctx.answerCallbackQuery();
    }

    if (data === 'pc_kamus') {
      const kb = new InlineKeyboard()
        .text('⚙️ Command Admin', 'pc_admin_cmd')
        .text('📻 Antrean Radio', 'pc_radio_queue')
        .row()
        .text('« Kembali ke Menu', 'pc_home');
      await ctx.editMessageText(renderKamusText(), { parse_mode: 'HTML', reply_markup: kb }).catch(() => {});
      return ctx.answerCallbackQuery();
    }

    if (data === 'pc_admin_cmd') {
      if (!admin) {
        return ctx.answerCallbackQuery({
          text: `Khusus Owner/Admin! ID kamu (${ctx.from.id}) belum masuk OWNER_IDS.`,
          show_alert: true
        });
      }
      const kb = new InlineKeyboard()
        .text('📝 Teks Greet & Bye', 'pc_greet_info')
        .text('📖 Kamus Command', 'pc_kamus')
        .row()
        .text('« Kembali ke Menu', 'pc_home');
      await ctx.editMessageText(renderAdminCmdText(), { parse_mode: 'HTML', reply_markup: kb }).catch(() => {});
      return ctx.answerCallbackQuery();
    }

    if (data === 'pc_greet_info') {
      if (!admin) return ctx.answerCallbackQuery({ text: 'Khusus Owner & Admin doang cuy.', show_alert: true });
      const kb = new InlineKeyboard()
        .text('⚙️ Command Admin', 'pc_admin_cmd')
        .text('📖 Kamus Command', 'pc_kamus')
        .row()
        .text('« Kembali ke Menu', 'pc_home');
      await ctx.editMessageText(renderGreetInfoText(), { parse_mode: 'HTML', reply_markup: kb }).catch(() => {});
      return ctx.answerCallbackQuery();
    }

    if (data === 'pc_radio_queue') {
      const kb = new InlineKeyboard().text('🔄 Refresh', 'pc_radio_queue');
      if (admin) {
        kb.text('🗑️ Kosongkan', 'pc_radio_clear');
      }
      kb.row()
        .text('📖 Kamus Command', 'pc_kamus')
        .text('« Kembali', 'pc_home');
      await ctx.editMessageText(renderRadioQueueText(), {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: kb
      }).catch(() => {});
      return ctx.answerCallbackQuery({ text: 'Antrean di-refresh.' });
    }

    if (data === 'pc_radio_clear') {
      if (!admin) return ctx.answerCallbackQuery({ text: 'Khusus Owner & Admin doang cuy.', show_alert: true });
      db.prepare("UPDATE radio_queue SET status = 'played' WHERE status = 'waiting'").run();
      const kb = new InlineKeyboard()
        .text('🔄 Refresh', 'pc_radio_queue')
        .text('📖 Kamus Command', 'pc_kamus')
        .row()
        .text('« Kembali ke Menu', 'pc_home');
      await ctx.editMessageText(renderRadioQueueText(), {
        parse_mode: 'HTML',
        reply_markup: kb
      }).catch(() => {});
      return ctx.answerCallbackQuery({ text: 'Antrean dikosongin.' });
    }

    await ctx.answerCallbackQuery();
  });

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
