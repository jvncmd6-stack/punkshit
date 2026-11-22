import { InlineKeyboard } from 'grammy';
import { ENV } from '../config/env.js';
import { db } from '../database/db.js';
import { escHtml } from '../services/syncEngine.js';

export const DEFAULT_GREET =
  'Wih, ada nyawa baru nyasar ke markas. Selamat datang, {mention}.\n\n' +
  'Cetak PunkID lo dulu biar sah jadi warga, terus baca Pasal & Help biar kaga salah tingkah di tongkrongan. Warga ke-{count} resmi tercatat.';

export const DEFAULT_BYE =
  'Yah, {name} ({username}) cabut dari markas.\n\n' +
  'Yaudah deh, akses PunkID resmi ditutup. Sisa warga di tongkrongan sekarang {count} orang.';

export const DEFAULT_PASAL =
  '<b>PASAL & ATURAN TONGKRONGAN</b>\n\n' +
  '1. Saling hargai sesama warga markas.\n' +
  '2. Dilarang spam link judi, scam, atau SARA.\n' +
  '3. Kalau mau nitip lagu pas OS, pake fitur Radio Gang dengan tertib.\n' +
  '4. Langgar aturan? Siap-siap disidang warga.';

export const DEFAULT_HELP =
  '<b>PUSAT BANTUAN (HELP)</b>\n\n' +
  '• <b>Cetak PunkID:</b> Buka Mini App lewat tombol utama.\n' +
  '• <b>Nitip Lagu OS:</b> Kirim link Spotify lewat Mini App atau lempar file MP3 langsung ke PC Mas Raka.\n' +
  '• <b>Panduan Lengkap App:</b> Ketik <code>/tutor</code> atau tekan tombol <b>Tutor Mini App</b>.';

export function getWarehouseId() {
  return (process.env.WAREHOUSE_CHANNEL_ID || '').trim();
}

export function getSetting(key, fallback = '') {
  const row = db.prepare('SELECT value FROM bot_settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

export function setSetting(key, value) {
  db.prepare(`
    INSERT INTO bot_settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, String(value));
}

export function isBotAdmin(userId) {
  const uid = String(userId);
  if ((ENV.OWNER_IDS || []).map(String).includes(uid)) return true;
  const u = db.prepare('SELECT role FROM users WHERE id = ?').get(uid);
  return Boolean(u && (u.role === 'owner' || u.role === 'admin' || u.role === 'moderator'));
}

export function isBotOwnerOrAdmin(userId) {
  const uid = String(userId);
  if ((ENV.OWNER_IDS || []).map(String).includes(uid)) return true;
  const u = db.prepare('SELECT role FROM users WHERE id = ?').get(uid);
  return Boolean(u && (u.role === 'owner' || u.role === 'admin'));
}

export function formatTemplate(tpl, member, totalCount) {
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

export function buildGreetKeyboard() {
  const kb = new InlineKeyboard();
  const appLink = ENV.MINIAPP_LINK || '';
  const chUrl = (process.env.CHANNEL_URL || '').trim();

  if (appLink) {
    kb.url('Buka PunkID & Markas', appLink);
    kb.url('Pasal & Help', `${appLink}?startapp=rules`);
  }
  if (chUrl) kb.row().url('Channel Info', chUrl);
  return kb;
}

export function buildByeKeyboard() {
  const kb = new InlineKeyboard();
  if (ENV.MINIAPP_LINK) kb.url('Cek Daftar Warga', `${ENV.MINIAPP_LINK}?startapp=warga`);
  return kb;
}

export function renderPrivateHomeText(userId) {
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

export function buildPrivateMenuKeyboard(userId) {
  const kb = new InlineKeyboard();

  if (ENV.MINIAPP_LINK) {
    kb.url('🪪 Buka Mini App PUNKSHIT.OS', ENV.MINIAPP_LINK);
  }

  const groupUrl = (process.env.GROUP_URL || '').trim();
  kb.row();
  if (groupUrl) kb.url('💬 Grup Markas', groupUrl);
  kb.text('📻 Antrean Radio', 'pc_radio_queue');

  kb.row()
    .text('📱 Tutor Mini App', 'pc_tutor_miniapp')
    .text('📖 Kamus Command', 'pc_kamus');

  if (isBotAdmin(userId)) {
    kb.row().text('⚙️ Command Admin', 'pc_admin_cmd');
  }

  return kb;
}

export function renderTutorMiniAppText() {
  return (
    '📱 <b>TUTOR CARA PAKAI SEMUA APP DI PUNKSHIT.OS</b>\n\n' +
    '<b>1. 🏠 Markas (Beranda & Absen)</b>\n' +
    '• Tap <b>Absen Harian</b> tiap hari buat jaga <i>Streak</i> & dapat bonus <b>PSC</b>.\n' +
    '• Ganti status nongkrong (<i>Presence</i>) biar warga lain tahu aktivitas kamu.\n\n' +
    '<b>2. 🪪 PunkID (Kartu Identitas & Profil)</b>\n' +
    '• Atur foto sampul (<i>Banner</i>), bio, lagu favorit <b>Spotify</b>, dan tanggal ulang tahun (klaim kado <b>+150 PSC</b> pas hari-H!).\n' +
    '• Tap kartu PunkID buat memutar bagian belakang kartu & pasang <i>Card Skin</i> atau <i>Border</i> dari gudang.\n\n' +
    '<b>3. 💰 Dompet PSC (Kas & Riwayat)</b>\n' +
    '• Cek saldo <b>PSC</b>, riwayat pemasukan/pengeluaran, dan mutasi transfer.\n\n' +
    '<b>4. 🕹️ Arena Gabut 2.0 (Mini-Games & Pass)</b>\n' +
    '• Mainkan 7 game gratis (<i>Mancing Galatama, Gosok Nasib, Mesin Rongsok, Reaction Rush, Punk Trivia, Gebuk Siapa, Adu Ingatan</i>) buat kumpulin <b>Arcade XP</b> & <b>PSC</b>.\n' +
    '• Klaim misi di tab <b>Quest</b>, naikkan level <b>Arcade Pass</b>, jual hasil tangkapan di <b>Koleksi</b>, dan aktifkan <b>Spark Shield</b> jika punya pasangan Spark.\n\n' +
    '<b>5. 👥 Warga (Sosial, Menfess & Klasemen)</b>\n' +
    '• Tap profil warga lain untuk <b>Sapa</b>, <b>Transfer PSC</b>, atau <b>Kirim Gift</b> dari gudang.\n' +
    '• <b>Wanted Board:</b> Cari komplotan mabar/voice (auto-post ke grup, hangus 24 jam).\n' +
    '• <b>Kotak Rahasia:</b> Kirim Menfess anonim & balas arsip Menfess warga.\n' +
    '• <b>Sidang Warga & Radio Gang:</b> Ikut voting polling & request lagu OS.\n' +
    '• <b>Klasemen:</b> Cek top Sultan PSC, Street Cred, & Spark Streak.\n\n' +
    '<b>6. 🛒 Lapak Rongsok & Lapak Warga</b>\n' +
    '• Beli <i>Border</i>, <i>Card Skin</i>, & <i>Collectible</i> resmi, atau jual-beli barang/jasa antarwarga pakai PSC.\n\n' +
    '<b>7. 🔥 Spark Buddies (Maks. 3 Slot)</b>\n' +
    '• Undang partner lewat username lalu ACC via bot. Rajin ngobrol bareng di grup tiap hari buat naikin <b>Spark Streak</b> & dapat bonus +15% XP di Arena.\n\n' +
    '<b>8. 📅 Kalender & 🏛️ Museum</b>\n' +
    '• <b>Kalender:</b> RSVP event markas & simpan <i>Time Capsule</i>.\n' +
    '• <b>Museum:</b> Upload meme/GIF markas & baca pasal aturan.'
  );
}

export function renderKamusText() {
  return (
    '📖 <b>KAMUS COMMAND WARGA — MAS RAKA</b>\n\n' +
    '<b>1. Menu Utama & Bantuan:</b>\n' +
    '• <code>/start</code> — Buka menu utama markas\n' +
    '• <code>/tutor</code> — Panduan cara pakai semua app di Mini App\n' +
    '• <code>/pasal</code> — Baca pasal & aturan tongkrongan\n' +
    '• <code>/help</code> — Pusat bantuan warga\n' +
    '• <code>/myid</code> — Cek Telegram ID akun kamu\n\n' +
    '<b>2. Spark Buddies & Ekonomi:</b>\n' +
    '• <code>/spark</code> — Buka menu Spark Buddies\n' +
    '• <code>/acc</code> — Terima ajakan Spark Buddies yang masuk\n' +
    '• <code>/cekpsc</code> — Cek saldo PSC & Street Cred kamu\n\n' +
    '<b>3. Radio Gang (OS):</b>\n' +
    '• <code>/antrean</code> — Cek daftar titipan lagu OS\n' +
    '• <code>/req Judul | Link</code> — Nitip lagu Spotify ke antrean'
  );
}

export function renderAdminCmdText() {
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
    '<b>Top Up / Give Koin PSC & Role:</b>\n' +
    '• <code>/givepsc @username 500</code> — Kirim/top up koin PSC\n' +
    '• <code>/givepsc 500</code> — Reply pesan warga di grup untuk give koin\n' +
    '• <code>/givepsc @username -200</code> — Potong koin PSC warga\n' +
    '• <code>/cekpsc @username</code> — Cek saldo & role warga\n' +
    '• <code>/setrole @username admin</code> — Atur role (admin/moderator/member)\n\n' +
    '<b>Kelola Radio Gang:</b>\n' +
    '• <code>/done 12</code> | <code>/clearradio</code> — Tandai selesai / kosongkan antrean\n\n' +
    '<b>Atur Sambutan Masuk (Greet) & Keluar (Bye):</b>\n' +
    '• <code>/setgreet teks baru</code> | <code>/setbye teks baru</code>\n' +
    '• <code>/setgreetmedia</code> | <code>/setbyemedia</code> (reply GIF/Stiker)\n' +
    '• <code>/delgreetmedia</code> | <code>/delbyemedia</code>\n' +
    '• <code>/setpasal teks</code> | <code>/sethelp teks</code>'
  );
}

export function renderRadioQueueText() {
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

export function renderGreetInfoText() {
  const greetText = getSetting('greet_text', DEFAULT_GREET);
  const byeText = getSetting('bye_text', DEFAULT_BYE);
  return (
    '📝 <b>TEKS GREET & BYE AKTIF</b>\n\n' +
    `<b>Teks Greet:</b>\n<blockquote>${escHtml(greetText)}</blockquote>\n\n` +
    `<b>Teks Bye:</b>\n<blockquote>${escHtml(byeText)}</blockquote>`
  );
}
