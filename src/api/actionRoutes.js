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

// Pastikan kolom streak_shield tersedia di tabel users
try {
  db.exec('ALTER TABLE users ADD COLUMN streak_shield INTEGER DEFAULT 0');
} catch (_) {}

function attachExtraFields(row) {
  const formatted = formatUser(row);
  if (formatted && row) {
    formatted.streakShield = Number(row.streak_shield || 0);
  }
  return formatted;
}

function getTierAbsenBonus(u) {
  const cred = Number(u.cred) || 0;
  const best = Math.max(Number(u.best) || 0, Number(u.streak) || 0);
  if (cred >= 300 && best >= 14) return 5; // Sepuh / Fosil
  if (cred >= 25 && best >= 3) return 2;   // Anak Nongkrong+
  return 0;
}

function calcAbsenBonus(streak, u) {
  const base = streak < 4 ? 2 : streak < 7 ? 3 : streak < 14 ? 5 : streak < 30 ? 7 : streak < 60 ? 10 : 15;
  const tierBonus = getTierAbsenBonus(u);
  return base + tierBonus + (streak % 7 === 0 ? 25 : 0);
}

// POST /api/absen -> Absen Harian + Auto Tameng Streak + Bonus Pangkat
actionRouter.post('/absen', requireUser, async (req, res) => {
  const u = req.dbUser;
  const today = todayWib();
  if (u.last_absen === today) {
    return res.status(400).json({ error: 'Hari ini udah tercatat absennya cuy. Besok gas lagi ya!' });
  }

  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  const hasShield = Number(u.streak_shield || 0) > 0;
  let shieldUsed = false;
  let nextStreak = 1;

  if (u.last_absen === yesterday) {
    nextStreak = (u.streak || 0) + 1;
  } else if ((u.streak || 0) > 0 && hasShield) {
    nextStreak = (u.streak || 0) + 1;
    shieldUsed = true;
  }

  const nextBest = Math.max(u.best || 0, nextStreak);
  const earned = calcAbsenBonus(nextStreak, u);
  const now = Date.now();

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE users
      SET psc = psc + ?, streak = ?, best = ?, cred = cred + 2, last_absen = ?, presence_at = ?,
          streak_shield = CASE WHEN ? = 1 THEN MAX(0, streak_shield - 1) ELSE streak_shield END
      WHERE id = ?
    `).run(earned, nextStreak, nextBest, today, now, shieldUsed ? 1 : 0, u.id);

    db.prepare('INSERT INTO transactions (user_id, type, amount, note, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(u.id, 'absen', earned, `Absen Harian hari ke-${nextStreak}${shieldUsed ? ' (Tameng Streak aktif)' : ''}`, now);
  });
  tx();

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(u.id);
  const feedMsg = shieldUsed
    ? `🛡️ Tameng Streak menyelamatkan ${u.name}! Lanjut absen hari ke-${nextStreak} (+${earned} PSC).`
    : `${u.name} hadir di markas! Absen hari ke-${nextStreak} (+${earned} PSC).`;
  addFeed(feedMsg);

  const feed = db.prepare('SELECT id, text, created_at AS createdAt FROM feed ORDER BY id DESC LIMIT 12').all();
  res.json({ user: attachExtraFields(updated), earned, shieldUsed, message: feedMsg, feed });
});

// POST /api/wallet/buy-shield -> Beli Tameng Streak (60 PSC)
actionRouter.post('/wallet/buy-shield', requireUser, (req, res) => {
  const u = req.dbUser;
  const price = 60;
  if (Number(u.streak_shield || 0) > 0) {
    return res.status(400).json({ error: 'Tameng Streak lo udah aktif cuy, siap jagain streak!' });
  }
  if ((u.psc || 0) < price) {
    return res.status(400).json({ error: 'Saldo PSC belum cukup nih cuy (butuh 60 PSC).' });
  }

  const now = Date.now();
  const tx = db.transaction(() => {
    db.prepare('UPDATE users SET psc = psc - ?, streak_shield = 1 WHERE id = ?').run(price, u.id);
    db.prepare('INSERT INTO transactions (user_id, type, amount, note, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(u.id, 'shield_buy', -price, 'Aktifkan Tameng Streak (1x Proteksi)', now);
  });
  tx();

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(u.id);
  res.json({ user: attachExtraFields(updated) });
});

// POST /api/sawer -> Bagi Rezeki (Kunci saldo & lempar tombol klaim ke Grup Telegram)
actionRouter.post('/sawer', requireUser, async (req, res) => {
  const u = req.dbUser;
  const amount = Math.floor(Number(req.body?.amount));
  const quota = Math.floor(Number(req.body?.quota));
  const mode = req.body?.mode === 'random' ? 'random' : 'equal';
  const message = String(req.body?.message || '').trim().slice(0, 70);

  if (!amount || amount < 10 || amount > 50000) {
    return res.status(400).json({ error: 'Minimal saweran 10 PSC ya cuy.' });
  }
  if (!quota || quota < 1 || quota > 50 || quota > amount) {
    return res.status(400).json({ error: 'Kuota penerima belum pas nih, cek lagi ya.' });
  }
  if (u.psc < amount) {
    return res.status(400).json({ error: 'Saldo PSC belum cukup buat nominal segitu cuy.' });
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
      `💸 <b>ADA REZEKI TONGKRONGAN!</b>\n` +
      `<b>${escHtml(u.name)}</b> baru aja berbagi <b>${amount} PSC</b> buat warga!\n\n` +
      `• Kuota: <b>${quota} warga</b> (${modeLabel})\n` +
      (message ? `• Pesan: <i>"${escHtml(message)}"</i>\n` : '') +
      `\nYuk gas klaim sebelum kehabisan!`;

    const kb = new InlineKeyboard().text(`💰 KLAIM REZEKI (0/${quota})`, `claim_sw:${sawId}`);
    try {
      await bot.api.sendMessage(ENV.GROUP_ID, text, { parse_mode: 'HTML', reply_markup: kb });
    } catch (e) {
      console.error('[Saweran Broadcast Error]:', e.message);
    }
  }

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(u.id);
  res.json({ user: attachExtraFields(updated) });
});

// POST /api/shop/buy -> Beli item dari Lapak Rongsok + Royalti 20% untuk Item Collab
actionRouter.post('/shop/buy', requireUser, async (req, res) => {
  const u = req.dbUser;
  const itemId = String(req.body?.itemId || '');
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);

  if (!item) return res.status(404).json({ error: 'Item tidak ditemukan di Lapak.' });
  if (item.stock === 0) return res.status(400).json({ error: 'Waduh, stok item ini baru aja habis!' });
  if (u.psc < item.price) return res.status(400).json({ error: 'Saldo PSC belum cukup cuy, kumpulin dulu yuk!' });

  if (item.type !== 'gift') {
    const already = db.prepare('SELECT 1 FROM inventory WHERE user_id = ? AND item_id = ?').get(u.id, item.id);
    if (already) return res.status(400).json({ error: 'Item ini udah ada di Gudang Barang lo cuy.' });
  }

  const now = Date.now();
  const hasCreatorRoyalty = item.is_collab === 1 && item.creator_id && String(item.creator_id) !== String(u.id);
  const royaltyAmount = hasCreatorRoyalty ? Math.max(1, Math.floor(item.price * 0.2)) : 0;

  const tx = db.transaction(() => {
    db.prepare('UPDATE users SET psc = psc - ? WHERE id = ?').run(item.price, u.id);
    if (item.stock > 0) {
      db.prepare('UPDATE items SET stock = stock - 1 WHERE id = ?').run(item.id);
    }
    db.prepare('INSERT INTO inventory (user_id, item_id, acquired_at) VALUES (?, ?, ?)').run(u.id, item.id, now);
    db.prepare('INSERT INTO transactions (user_id, type, amount, note, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(u.id, 'shop_buy', -item.price, `Beli ${item.name}`, now);

    if (royaltyAmount > 0) {
      db.prepare('UPDATE users SET psc = psc + ? WHERE id = ?').run(royaltyAmount, String(item.creator_id));
      db.prepare('INSERT INTO transactions (user_id, type, amount, note, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(String(item.creator_id), 'collab_royalty', royaltyAmount, `Royalti Collab: ${item.name}`, now);
    }
  });
  tx();

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(u.id);

  await notifyPrivateUser(
    u.id,
    `🛒 <b>TRANSAKSI BERHASIL!</b>\n\n` +
    `• Item: <b>${escHtml(item.name)}</b> (Lapak Rongsok)\n` +
    `• Harga: <b>-${item.price} PSC</b>\n` +
    `• Sisa Saldo: <b>${updated.psc} PSC</b>\n\n` +
    `Mantap! Item sudah masuk ke Gudang Barang lo.`,
    { buttonText: '🛒 BUKA LAPAK RONGSOK', startParam: 'lapak' }
  );

  if (royaltyAmount > 0) {
    await notifyPrivateUser(
      item.creator_id,
      `🎨 <b>ROYALTI COLLAB CAIR!</b>\n\n` +
      `Warga <b>${escHtml(u.name)}</b> baru saja membeli item collab karyamu: <b>${escHtml(item.name)}</b>!\n` +
      `• Royalti 20%: <b>+${royaltyAmount} PSC</b>`,
      { buttonText: '💰 CEK DOMPET', startParam: 'kas' }
    );
  }

  const inv = db.prepare('SELECT id, item_id AS itemId, acquired_at AS acquiredAt FROM inventory WHERE user_id = ? ORDER BY id DESC').all(u.id);
  res.json({ user: attachExtraFields(updated), inv, catalog: getCatalog() });
});

// POST /api/gift/send -> Kirim hadiah gift ke warga lain (Mendukung Mode Anonim + Hanya notif PC)
actionRouter.post('/gift/send', requireUser, async (req, res) => {
  const u = req.dbUser;
  const itemId = String(req.body?.itemId || '');
  const toRaw = String(req.body?.toUsername || '').trim().replace(/^@/, '');
  const message = String(req.body?.message || '').trim().slice(0, 70);
  const isAnon = Boolean(req.body?.anonymous);

  const item = db.prepare('SELECT * FROM items WHERE id = ? AND type = ?').get(itemId, 'gift');
  if (!item) return res.status(404).json({ error: 'Gift tidak ditemukan.' });
  if (u.psc < item.price) return res.status(400).json({ error: 'Saldo PSC belum cukup cuy.' });

  const recipient = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)').get(toRaw);
  if (!recipient) {
    return res.status(404).json({ error: `Warga @${toRaw} belum terdaftar di PUNKSHIT.OS.` });
  }
  if (recipient.id === u.id) {
    return res.status(400).json({ error: 'Kalau buat diri sendiri tinggal beli langsung aja cuy!' });
  }

  const now = Date.now();
  const tx = db.transaction(() => {
    db.prepare('UPDATE users SET psc = psc - ?, cred = cred + 3, has_shared = 1 WHERE id = ?').run(item.price, u.id);
    db.prepare('INSERT INTO inventory (user_id, item_id, acquired_at) VALUES (?, ?, ?)').run(recipient.id, item.id, now);
    db.prepare('INSERT INTO transactions (user_id, type, amount, note, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(u.id, 'gift_send', -item.price, `Kirim ${item.name} ke @${recipient.username}${isAnon ? ' (Anonim)' : ''}`, now);
  });
  tx();

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(u.id);
  const publicSender = isAnon ? 'Warga Misterius' : u.name;
  addFeed(`${publicSender} ngirim ${item.name} ke @${recipient.username}.`);

  const senderDisplay = isAnon
    ? '🕵️ <b>Warga Misterius</b> <i>(Secret Admirer / Anonim)</i>'
    : `<b>${escHtml(u.name)}</b>${u.username ? ` (@${escHtml(u.username)})` : ''}`;
  const recipTag = recipient.username ? ` (@${escHtml(recipient.username)})` : '';

  await notifyPrivateUser(
    recipient.id,
    `🎁 <b>KAMU DAPAT GIFT BARU!</b>\n\n` +
    `• Dari: ${senderDisplay}\n` +
    `• Hadiah: <b>${escHtml(item.name)}</b>\n` +
    (message ? `• Pesan: <i>"${escHtml(message)}"</i>\n` : '') +
    `\nItem sudah masuk ke Gudang Barang kamu. Buka PunkID untuk <b>Pin</b> ke kartu!`,
    { buttonText: '🎁 CEK GUDANG & PUNKID', startParam: 'gue' }
  );

  await notifyPrivateUser(
    u.id,
    `🎁 <b>GIFT ${isAnon ? 'ANONIM ' : ''}TERKIRIM!</b>\n\n` +
    `• Penerima: <b>${escHtml(recipient.name)}</b>${recipTag}\n` +
    `• Item: <b>${escHtml(item.name)}</b> (-${item.price} PSC)\n` +
    `• Mode: <b>${isAnon ? '🕵️ Anonim (Identitas Disembunyikan)' : '👤 Terbuka'}</b>\n` +
    `• Bonus Reputasi: <b>+3 Street Cred</b>\n` +
    `• Sisa Saldo: <b>${updated.psc} PSC</b>`,
    { buttonText: '🪪 BUKA PUNKSHIT.OS', startParam: 'gue' }
  );

  res.json({ user: attachExtraFields(updated) });
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
  res.json({ list: rows.map(attachExtraFields) });
});
