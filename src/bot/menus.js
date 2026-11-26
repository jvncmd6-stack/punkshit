import { InlineKeyboard } from 'grammy';
import { ENV } from '../config/env.js';
import { db } from '../database/db.js';
import { escHtml, buildMiniAppUrl } from '../services/syncEngine.js';
import {
  DEFAULT_GREET,
  DEFAULT_BYE,
  DEFAULT_PASAL,
  DEFAULT_HELP,
  renderTutorMiniAppText,
  renderKamusText,
  renderAdminCmdText as buildAdminCmdBody
} from './kamusTexts.js';

export {
  DEFAULT_GREET,
  DEFAULT_BYE,
  DEFAULT_PASAL,
  DEFAULT_HELP,
  renderTutorMiniAppText,
  renderKamusText
};

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
  const homeUrl = buildMiniAppUrl('home');
  const rulesUrl = buildMiniAppUrl('rules');
  const chUrl = (process.env.CHANNEL_URL || '').trim();

  if (homeUrl) {
    kb.url('Buka PunkID & Markas', homeUrl);
    kb.url('Pasal & Help', rulesUrl);
  }
  if (chUrl) kb.row().url('Channel Info', chUrl);
  return kb;
}

export function buildByeKeyboard() {
  const kb = new InlineKeyboard();
  const wargaUrl = buildMiniAppUrl('warga');
  if (wargaUrl) kb.url('Cek Daftar Warga', wargaUrl);
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
  const homeUrl = buildMiniAppUrl('home');

  if (homeUrl) {
    kb.url('🪪 Buka Mini App PUNKSHIT.OS', homeUrl);
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

export function buildTutorKeyboard(activeTab = 'overview', includeBackMenu = true) {
  const t1 = activeTab === '1' ? '• 🪪 PunkID & Gift •' : '🪪 PunkID & Gift';
  const t2 = activeTab === '2' ? '• 💰 Lapak & Spark •' : '💰 Lapak & Spark';
  const t3 = activeTab === '3' ? '• 🕹️ Arena & Warga •' : '🕹️ Arena & Warga';
  const t4 = activeTab === '4' ? '• 🎭 Event & Dalang •' : '🎭 Event & Dalang';

  const kb = new InlineKeyboard()
    .text(t1, 'pc_tutor_1')
    .text(t2, 'pc_tutor_2')
    .row()
    .text(t3, 'pc_tutor_3')
    .text(t4, 'pc_tutor_4');

  const homeUrl = buildMiniAppUrl('home');
  if (homeUrl) {
    kb.row().url('🪪 Buka Mini App PUNKSHIT.OS', homeUrl);
  }
  if (includeBackMenu) {
    kb.row().text('📖 Kamus Command', 'pc_kamus').text('« Menu Utama', 'pc_home');
  }
  return kb;
}

export function renderAdminCmdText() {
  return buildAdminCmdBody(
    getWarehouseId(),
    getSetting('greet_media', ''),
    getSetting('bye_media', '')
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
