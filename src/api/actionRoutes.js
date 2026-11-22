import { Router } from 'express';
import crypto from 'crypto';
import { InlineKeyboard } from 'grammy';
import { ENV } from '../config/env.js';
import { db, addFeed } from '../database/db.js';
import { requireUser } from '../middlewares/authTma.js';
import {
  formatUser,
  getCatalog,
  getBot,
  notifyPrivateUser,
  escHtml,
  todayWib
} from '../services/syncEngine.js';

export const actionRouter = Router();

function calcAbsenBonus(streak) {
  const base = streak < 4 ? 2 : streak < 7 ? 3 : streak < 14 ? 5 : streak < 30 ? 7 : streak < 60 ? 10 : 15;
  return base + (streak % 7 === 0 ? 25 : 0);
}

// POST /api/absen -> Absen Nyawa harian (Hanya masuk log aktivitas WebApp, tanpa spam Grup)
actionRouter.post('/absen', requireUser, async (req, res) => {
  const u = req.dbUser;
  const today = todayWib();
  if (u.last_absen === today) {
    return res.status(400).json({ error: 'Lu udah absen hari ini bro. Besok lagi!' });
  }

  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  const nextStreak = (u.last_absen === yesterday) ? (u.streak + 1) : 1;
  const nextBest = Math.max(u.best, nextStreak);
  const earned = calcAbsenBonus(nextStreak);
  const now = Date.now();

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE users SET psc = psc + ?, streak = ?, best = ?, cred = cred + 2, last_absen = ?, presence_at = ?
      WHERE id = ?
    `).run(earned, nextStreak, nextBest, today, now, u.id);

    db.prepare('INSERT INTO transactions (user_id, type, amount, note, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(u.id, 'absen', earned, `Absen Nyawa hari ke-${nextStreak}`, now);
  });
  tx();

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(u.id);
  const feedMsg = `MASIH HIDUP TERNYATA. ${u.name} absen hari ke-${nextStreak} (+${earned} PSC).`;
  addFeed(feedMsg);

  const feed = db.prepare('SELECT id, text, created_at AS createdAt FROM feed ORDER BY id DESC LIMIT 12').all();
  res.json({ user: formatUser(updated), earned, message: feedMsg, feed });
});

// POST /api/sawer -> Bagi Rezeki (Kunci saldo & lempar tombol klaim ke Grup Telegram)
actionRouter.post('/sawer', requireUser, async (req, res) => {
  const u = req.dbUser;
  const amount = Math.floor(Number(req.body?.amount));
  const quota = Math.floor(Number(req.body?.quota));
  const mode = req.body?.mode === 'random' ? 'random' : 'equal';
  const message = String(req.body?.message || '').trim().slice(0, 70);

  if (!amount || amount < 10 || amount > 50000) {
    return res.status(400).json({ error: 'Nominal saweran minimal 10 PSC.' });
  }
  if (!quota || quota < 1 || quota > 50 || quota > amount) {
    return res.status(400).json({ error: 'Kuota penerima tidak valid.' });
  }
  if (u.psc < amount) {
    return res.status(400).json({ error: 'Saldo PSC tidak mencukupi.' });
  }

  const sawId = 'sw_' + crypto.randomBytes(5).toString('hex');
  const now = Date.now();

  const tx = db.transaction(() => {
    db.prepare('UPDATE users SET psc = psc - ?, cred = cred + 5, has_shared = 1 WHERE id = ?').run(amount, u.id);
    db.prepare('INSERT INTO transactions (user_id, type, amount, note, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(u.id, 'sawer_out', -amount, `Bagi Rezeki (${quota} kuota)`, now);
    db.prepare(`
      INSERT INTO saweran (id, creator_id, creator_name, total_amount, remaining_amount, quota, mode, message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(sawId, u.id, u.name, amount, amount, quota, mode, message, now);
  });
  tx();

  const bot = getBot();
  if (bot && ENV.GROUP_ID) {
    const modeLabel = mode === 'random' ? 'Bagi Acak' : 'Bagi Rata';
    const text =
      `💸 <b>WOI, ADA DUIT JATUH!</b>\n` +
      `<b>${escHtml(u.name)}</b> baru aja ngelempar <b>${amount} PSC</b>!\n\n` +
      `• Kuota: <b>${quota} warga</b> (${modeLabel})\n` +
      (message ? `• Pesan: <i>"${escHtml(message)}"</i>\n` : '') +
      `\nSiapa cepat, dia kenyang!`;

    const kb = new InlineKeyboard().text(`💰 SIKAT SAWERAN (0/${quota})`, `claim_sw:${sawId}`);
    try {
      await bot.api.sendMessage(ENV.GROUP_ID, text, { parse_mode: 'HTML', reply_markup: kb });
    } catch (e) {
      console.error('[Saweran Broadcast Error]:', e.message);
    }
  }

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(u.id);
  res.json({ user: formatUser(updated) });
});

// POST /api/shop/buy -> Beli item dari Lapak Rongsok (Hanya notif ke PC Bot Pembeli)
actionRouter.post('/shop/buy', requireUser, async (req, res) => {
  const u = req.dbUser;
  const itemId = String(req.body?.itemId || '');
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);

  if (!item) return res.status(404).json({ error: 'Item tidak ditemukan di Lapak.' });
  if (item.stock === 0) return res.status(400).json({ error: 'Stok item ini sudah habis terjual!' });
  if (u.psc < item.price) return res.status(400).json({ error: 'Saldo PSC kurang!' });

  if (item.type !== 'gift') {
    const already = db.prepare('SELECT 1 FROM inventory WHERE user_id = ? AND item_id = ?').get(u.id, item.id);
    if (already) return res.status(400).json({ error: 'Lu sudah memiliki item ini di Gudang Barang.' });
  }

  const now = Date.now();
  const tx = db.transaction(() => {
    db.prepare('UPDATE users SET psc = psc - ? WHERE id = ?').run(item.price, u.id);
    if (item.stock > 0) {
      db.prepare('UPDATE items SET stock = stock - 1 WHERE id = ?').run(item.id);
    }
    db.prepare('INSERT INTO inventory (user_id, item_id, acquired_at) VALUES (?, ?, ?)').run(u.id, item.id, now);
    db.prepare('INSERT INTO transactions (user_id, type, amount, note, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(u.id, 'shop_buy', -item.price, `Beli ${item.name}`, now);
  });
  tx();

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(u.id);

  await notifyPrivateUser(
    u.id,
    `🛒 <b>PURCHASE COMPLETE!</b>\n\n` +
    `• Item: <b>${escHtml(item.name)}</b> (Lapak Rongsok)\n` +
    `• Harga: <b>-${item.price} PSC</b>\n` +
    `• Sisa Saldo: <b>${updated.psc} PSC</b>\n\n` +
    `Gaya bertambah! Item sudah masuk ke Gudang Barang lu.`,
    { buttonText: '🛒 BUKA LAPAK RONGSOK', startParam: 'lapak' }
  );

  const inv = db.prepare('SELECT id, item_id AS itemId, acquired_at AS acquiredAt FROM inventory WHERE user_id = ? ORDER BY id DESC').all(u.id);
  res.json({ user: formatUser(updated), inv, catalog: getCatalog() });
});

// POST /api/gift/send -> Kirim hadiah gift ke warga lain (Hanya notif PC ke Penerima & Pengirim, tanpa spam Grup)
actionRouter.post('/gift/send', requireUser, async (req, res) => {
  const u = req.dbUser;
  const itemId = String(req.body?.itemId || '');
  const toRaw = String(req.body?.toUsername || '').trim().replace(/^@/, '');
  const message = String(req.body?.message || '').trim().slice(0, 70);

  const item = db.prepare('SELECT * FROM items WHERE id = ? AND type = ?').get(itemId, 'gift');
  if (!item) return res.status(404).json({ error: 'Gift tidak ditemukan.' });
  if (u.psc < item.price) return res.status(400).json({ error: 'Saldo PSC tidak cukup.' });

  const recipient = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)').get(toRaw);
  if (!recipient) {
    return res.status(404).json({ error: `Warga @${toRaw} belum terdaftar di PUNKSHIT.OS.` });
  }
  if (recipient.id === u.id) {
    return res.status(400).json({ error: 'Nggak bisa kirim gift ke diri sendiri, beli aja langsung.' });
  }

  const now = Date.now();
  const tx = db.transaction(() => {
    db.prepare('UPDATE users SET psc = psc - ?, cred = cred + 3, has_shared = 1 WHERE id = ?').run(item.price, u.id);
    db.prepare('INSERT INTO inventory (user_id, item_id, acquired_at) VALUES (?, ?, ?)').run(recipient.id, item.id, now);
    db.prepare('INSERT INTO transactions (user_id, type, amount, note, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(u.id, 'gift_send', -item.price, `Kirim ${item.name} ke @${recipient.username}`, now);
  });
  tx();

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(u.id);
  addFeed(`${u.name} ngirim ${item.name} ke @${recipient.username}.`);

  const senderTag = u.username ? ` (@${escHtml(u.username)})` : '';
  const recipTag = recipient.username ? ` (@${escHtml(recipient.username)})` : '';

  // Notif khusus ke Penerima Gift
  await notifyPrivateUser(
    recipient.id,
    `🎁 <b>KAMU DAPAT GIFT BARU!</b>\n\n` +
    `• Dari: <b>${escHtml(u.name)}</b>${senderTag}\n` +
    `• Hadiah: <b>${escHtml(item.name)}</b>\n` +
    (message ? `• Pesan: <i>"${escHtml(message)}"</i>\n` : '') +
    `\nItem sudah masuk ke Gudang Barang kamu. Buka PunkID untuk <b>Pin</b> ke kartu!`,
    { buttonText: '🎁 CEK GUDANG & PUNKID', startParam: 'gue' }
  );

  // Struk khusus ke Pengirim Gift
  await notifyPrivateUser(
    u.id,
    `🎁 <b>GIFT TERKIRIM!</b>\n\n` +
    `• Penerima: <b>${escHtml(recipient.name)}</b>${recipTag}\n` +
    `• Item: <b>${escHtml(item.name)}</b> (-${item.price} PSC)\n` +
    `• Bonus Reputasi: <b>+3 Street Cred</b>\n` +
    `• Sisa Saldo: <b>${updated.psc} PSC</b>`,
    { buttonText: '🪪 BUKA PUNKSHIT.OS', startParam: 'gue' }
  );

  res.json({ user: formatUser(updated) });
});

// GET /api/wallet/history -> Buku Kas (Riwayat Transaksi)
actionRouter.get('/wallet/history', requireUser, (req, res) => {
  const rows = db.prepare(`
    SELECT id, type, amount, note, created_at AS createdAt
    FROM transactions WHERE user_id = ? ORDER BY id DESC LIMIT 30
  `).all(req.dbUser.id);
  res.json({ transactions: rows });
});

// GET /api/leaderboard -> Hall of Fame
actionRouter.get('/leaderboard', (req, res) => {
  const allowed = { streak: 'streak', cred: 'cred', psc: 'psc', best: 'best' };
  const col = allowed[req.query.by] || 'streak';
  const rows = db.prepare(`SELECT * FROM users ORDER BY ${col} DESC, created_at ASC LIMIT 20`).all();
  res.json({ list: rows.map(formatUser) });
});
