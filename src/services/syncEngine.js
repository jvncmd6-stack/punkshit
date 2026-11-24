import fs from 'fs';
import path from 'path';
import { InlineKeyboard } from 'grammy';
import { ENV } from '../config/env.js';
import { db, addFeed } from '../database/db.js';

let botInstance = null;

export function bindBotInstance(bot) {
  botInstance = bot;
}

export function getBot() {
  return botInstance;
}

export function todayWib() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
}

export function escHtml(s = '') {
  return String(s).replace(/[&<>]/g, c => ({ '&': '&', '<': '<', '>': '>' }[c]));
}

export function parsePinnedGifts(raw) {
  if (!raw) return [];
  const str = String(raw).trim();
  if (!str) return [];
  if (str.startsWith('[')) {
    try {
      const arr = JSON.parse(str);
      return Array.isArray(arr) ? arr.map(String).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [str];
}

export function buildMiniAppUrl(startParam = '') {
  if (!ENV.MINIAPP_LINK) return '';
  const railwayApi = process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : (process.env.API_URL || '').trim();

  // Ambil subdomain-nya saja agar total parameter startapp selalu < 64 karakter (limit Telegram)
  const slugMatch = railwayApi.match(/^https?:\/\/([a-zA-Z0-9-]+)\.up\.railway\.app/i);
  let payload = startParam || 'home';

  if (slugMatch) {
    payload = `${payload}__r_${slugMatch[1]}`;
  } else if (railwayApi) {
    payload = `${payload}__${Buffer.from(railwayApi).toString('base64url')}`;
  }

  return `${ENV.MINIAPP_LINK}?startapp=${encodeURIComponent(payload)}`;
}

// Kirim notif personal khusus ke PC Bot penerima (mendukung direct URL seperti https://t.me/username)
export async function notifyPrivateUser(targetUserId, text, { buttonText = '🪪 BUKA PUNKSHIT.OS', startParam = 'home', buttonUrl = '' } = {}) {
  if (!botInstance || !targetUserId || !text) return;
  try {
    const url = buttonUrl || buildMiniAppUrl(startParam);
    const kb = url ? new InlineKeyboard().url(buttonText, url) : undefined;
    await botInstance.api.sendMessage(String(targetUserId), text, {
      parse_mode: 'HTML',
      reply_markup: kb,
      disable_web_page_preview: true
    });
  } catch (err) {
    // Abaikan jika user belum pernah /start bot di PC
  }
}

export async function syncTelegramAvatar(userId, tgUserObj = null) {
  const uid = String(userId);
  if (tgUserObj && tgUserObj.username !== undefined) {
    db.prepare('UPDATE users SET username = ? WHERE id = ?').run(tgUserObj.username || '', uid);
  }

  if (!botInstance) return null;
  try {
    const photos = await botInstance.api.getUserProfilePhotos(Number(uid), { limit: 1 });
    if (!photos || !photos.total_count || !photos.photos[0]?.length) return null;

    const sizes = photos.photos[0];
    const picked = sizes[Math.min(1, sizes.length - 1)];
    const fileInfo = await botInstance.api.getFile(picked.file_id);
    if (!fileInfo.file_path) return null;

    const fileUrl = `https://api.telegram.org/file/bot${ENV.BOT_TOKEN}/${fileInfo.file_path}`;
    const resp = await fetch(fileUrl);
    if (!resp.ok) return null;

    const buf = Buffer.from(await resp.arrayBuffer());
    const filename = `pfp-${uid}.jpg`;
    const savePath = path.join(ENV.UPLOAD_DIR, 'banners', filename);
    await fs.promises.writeFile(savePath, buf);

    const publicUrl = `/uploads/banners/${filename}?v=${Date.now()}`;
    db.prepare('UPDATE users SET photo_url = ? WHERE id = ?').run(publicUrl, uid);
    return publicUrl;
  } catch {
    return null;
  }
}

export function formatUser(row) {
  if (!row) return null;
  const today = todayWib();

  let equippedBorderUrl = '';
  if (row.equipped_border_id) {
    const bItem = db.prepare('SELECT image_url FROM items WHERE id = ?').get(row.equipped_border_id);
    if (bItem) equippedBorderUrl = bItem.image_url || '';
  }

  const pinnedGifts = parsePinnedGifts(row.pinned_gift_id);

  const sixHours = 6 * 3600 * 1000;
  const activePresence = (Date.now() - (row.presence_at || 0) < sixHours)
    ? row.presence
    : '☕ Nongki Dulu';

  return {
    id: row.id,
    username: row.username,
    name: row.name,
    memberNo: row.member_no,
    photoUrl: row.photo_url,
    bannerUrl: row.banner_url,
    bio: row.bio,
    spotifyUrl: row.spotify_url,
    birthday: row.birthday,
    role: row.role,
    psc: row.psc,
    streak: row.streak,
    best: row.best,
    cred: row.cred,
    absenToday: row.last_absen === today,
    presence: activePresence,
    ringStyle: row.ring_style,
    equippedBorderId: row.equipped_border_id,
    equippedBorderUrl,
    equippedSkinId: row.equipped_skin_id,
    pinnedGiftId: pinnedGifts[0] || '',
    pinnedGifts,
    fishToday: row.fish_date === today ? row.fish_today : 0,
    fishCount: row.fish_count,
    scratchedToday: row.scratched_date === today,
    hasShared: Boolean(row.has_shared)
  };
}

export function getCatalog() {
  return db.prepare('SELECT * FROM items ORDER BY created_at DESC').all().map(it => ({
    id: it.id,
    type: it.type,
    name: it.name,
    price: it.price,
    rarity: it.rarity,
    stock: it.stock,
    desc: it.desc,
    imageUrl: it.image_url,
    colors: it.colors ? JSON.parse(it.colors) : null,
    svgPath: it.svg_path,
    skinClass: it.skin_class
  }));
}

export function getOnlineUsers() {
  const cutoff = Date.now() - 6 * 3600 * 1000;
  const rows = db.prepare('SELECT * FROM users WHERE presence_at >= ? OR last_absen = ? ORDER BY presence_at DESC LIMIT 40')
    .all(cutoff, todayWib());
  return rows.map(formatUser);
}

export async function broadcastToTelegram({ target = 'group', text = '', buttonText = '🪪 BUKA MARKAS', startParam = '', feedText = '' }) {
  if (feedText) addFeed(feedText);
  if (!botInstance || !text) return;

  const upperText = text.toUpperCase();

  // 1. Blokir total notif personal/spam agar TIDAK pernah dikirim ke Grup maupun Channel
  const blockedKeywords = [
    'MASIH HIDUP TERNYATA',
    'ABSEN HARI KE-',
    'SAPAAN MARKAS',
    'KIRIM GIFT',
    'MENGIRIM GIFT',
    'HADIAH MARKAS',
    'TRANSFER PSC',
    'SAWERAN PSC',
    'SPARK SECURED',
    'AJAKAN SPARK',
    'TRANSAKSI LAPAK'
  ];
  if (blockedKeywords.some(kw => upperText.includes(kw))) {
    return;
  }

  // 2. Pisahkan tujuan Channel Confess vs Channel Pengumuman
  const confessChannelId = (ENV.MENFESS_CHANNEL_ID || process.env.MENFESS_CHANNEL_ID || ENV.CHANNEL_ID || '').trim();
  const announceChannelId = (ENV.CHANNEL_ID || '').trim();

  let finalTarget = target;
  if (upperText.includes('KOTAK RAHASIA') || upperText.includes('CONFESS')) {
    finalTarget = 'confess';
  } else if (upperText.includes('PENGUMUMAN MARKAS')) {
    finalTarget = 'both';
  }

  const url = buildMiniAppUrl(startParam);
  const kb = url ? new InlineKeyboard().url(buttonText, url) : undefined;

  const sendSafe = async chatId => {
    if (!chatId) return;
    try {
      await botInstance.api.sendMessage(chatId, text, { parse_mode: 'HTML', reply_markup: kb });
    } catch (err) {
      console.error(`[Broadcaster] Gagal kirim ke ${chatId}:`, err.message);
    }
  };

  if (finalTarget === 'confess') {
    await sendSafe(confessChannelId);
    return;
  }

  if (finalTarget === 'group' || finalTarget === 'both') await sendSafe(ENV.GROUP_ID);
  if (finalTarget === 'channel' || finalTarget === 'both') await sendSafe(announceChannelId);
}
