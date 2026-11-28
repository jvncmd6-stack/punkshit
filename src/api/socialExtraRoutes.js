import { Router } from 'express';
import { db, addFeed } from '../database/db.js';
import { requireUser } from '../middlewares/authTma.js';
import {
  formatUser,
  getCatalog,
  parsePinnedGifts,
  notifyPrivateUser,
  escHtml
} from '../services/syncEngine.js';

export const socialExtraRouter = Router();

try { db.exec("ALTER TABLE users ADD COLUMN active_title TEXT DEFAULT ''"); } catch (_) {}

// 1. GET /api/leaderboard/global -> Klasemen Top Sultan PSC, Street Cred, & Spark Streak
socialExtraRouter.get('/leaderboard/global', (req, res) => {
  try {
    const topPsc = db.prepare(`
      SELECT id, name, username, role, psc, cred, streak,
             COALESCE(active_title, '') AS activeTitleId,
             photo_url AS photoUrl, equipped_border_id AS equippedBorderId, ring_style AS ringStyle
      FROM users
      WHERE COALESCE(is_frozen, 0) = 0
      ORDER BY psc DESC, id ASC
      LIMIT 10
    `).all();

    const topCred = db.prepare(`
      SELECT id, name, username, role, psc, cred, streak,
             COALESCE(active_title, '') AS activeTitleId,
             photo_url AS photoUrl, equipped_border_id AS equippedBorderId, ring_style AS ringStyle
      FROM users
      WHERE COALESCE(is_frozen, 0) = 0
      ORDER BY cred DESC, psc DESC
      LIMIT 10
    `).all();

    let topSpark = [];
    try {
      topSpark = db.prepare(`
        SELECT user1, user2, streak, xp
        FROM spark_pairs
        WHERE status = 'paired' AND streak > 0
        ORDER BY streak DESC, xp DESC
        LIMIT 10
      `).all();
    } catch (_) {}

    res.json({ topPsc, topCred, topSpark });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat klasemen markas: ' + err.message });
  }
});

// 2. POST /api/social/transfer-psc -> Transfer PSC antarwarga (Notif PC ke Penerima & Pengirim, tanpa spam Grup)
socialExtraRouter.post('/social/transfer-psc', requireUser, async (req, res) => {
  const sender = req.dbUser;
  const targetId = String(req.body?.targetUserId || '').trim();
  const amount = Math.floor(Number(req.body?.amount) || 0);
  const note = String(req.body?.note || '').trim().slice(0, 60);

  if (!targetId || targetId === String(sender.id)) {
    return res.status(400).json({ error: 'Target penerima tidak valid.' });
  }
  if (amount < 10 || amount > 5000) {
    return res.status(400).json({ error: 'Nominal transfer minimal 10 PSC dan maksimal 5.000 PSC.' });
  }
  if ((sender.psc || 0) < amount) {
    return res.status(400).json({ error: 'Saldo PSC kamu kurang bro!' });
  }

  const receiver = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
  if (!receiver) {
    return res.status(404).json({ error: 'Warga penerima tidak ditemukan.' });
  }

  const now = Date.now();
  const tx = db.transaction(() => {
    db.prepare('UPDATE users SET psc = psc - ? WHERE id = ?').run(amount, sender.id);
    db.prepare('UPDATE users SET psc = psc + ?, cred = cred + 1 WHERE id = ?').run(amount, receiver.id);

    db.prepare('INSERT INTO transactions (user_id, type, amount, note, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(sender.id, 'transfer_out', -amount, `Transfer ke ${receiver.name}${note ? ': ' + note : ''}`, now);
    db.prepare('INSERT INTO transactions (user_id, type, amount, note, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(receiver.id, 'transfer_in', amount, `Kiriman dari ${sender.name}${note ? ': ' + note : ''}`, now);
  });
  tx();

  const updatedSender = db.prepare('SELECT * FROM users WHERE id = ?').get(sender.id);
  const updatedReceiver = db.prepare('SELECT * FROM users WHERE id = ?').get(receiver.id);
  addFeed(`${sender.name} transfer ${amount} PSC ke ${receiver.name}.`);

  const senderTag = sender.username ? ` (@${escHtml(sender.username)})` : '';
  const receiverTag = receiver.username ? ` (@${escHtml(receiver.username)})` : '';

  await notifyPrivateUser(
    receiver.id,
    `💸 <b>TRANSFER PSC MASUK!</b>\n\n` +
    `• Dari: <b>${escHtml(sender.name)}</b>${senderTag}\n` +
    `• Nominal: <b>+${amount} PSC</b> (+1 Street Cred)\n` +
    `• Saldo Sekarang: <b>${updatedReceiver.psc} PSC</b>\n` +
    (note ? `• Catatan: <i>"${escHtml(note)}"</i>` : ''),
    { buttonText: '🪪 CEK DOMPET', startParam: 'home' }
  );

  await notifyPrivateUser(
    sender.id,
    `💸 <b>TRANSFER PSC BERHASIL!</b>\n\n` +
    `• Penerima: <b>${escHtml(receiver.name)}</b>${receiverTag}\n` +
    `• Nominal: <b>-${amount} PSC</b>\n` +
    `• Sisa Saldo: <b>${updatedSender.psc} PSC</b>\n` +
    (note ? `• Catatan: <i>"${escHtml(note)}"</i>` : ''),
    { buttonText: '🪪 BUKA PUNKSHIT.OS', startParam: 'home' }
  );

  res.json({
    ok: true,
    message: `Berhasil kirim ${amount} PSC ke ${receiver.name}!`,
    user: formatUser(updatedSender)
  });
});

// 3. POST /api/social/send-gift -> Kirim item dari Gudang Barang ke warga lain (Mendukung Mode Anonim)
socialExtraRouter.post('/social/send-gift', requireUser, async (req, res) => {
  const sender = req.dbUser;
  const targetId = String(req.body?.targetUserId || '').trim();
  const invId = Number(req.body?.invId);
  const note = String(req.body?.note || '').trim().slice(0, 60);
  const isAnon = Boolean(req.body?.anonymous);

  if (!targetId || targetId === String(sender.id)) {
    return res.status(400).json({ error: 'Target penerima tidak valid.' });
  }
  if (!invId) {
    return res.status(400).json({ error: 'Pilih item dari gudang kamu dulu.' });
  }

  const receiver = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
  if (!receiver) {
    return res.status(404).json({ error: 'Warga penerima tidak ditemukan.' });
  }

  const invRow = db.prepare('SELECT * FROM inventory WHERE id = ? AND user_id = ?').get(invId, sender.id);
  if (!invRow) {
    return res.status(404).json({ error: 'Item tidak ditemukan di gudang kamu.' });
  }

  const catalog = getCatalog();
  const itemMeta = catalog.find(i => i.id === invRow.item_id) || { name: invRow.item_id, rarity: 'Rare' };

  const transferTx = db.transaction(() => {
    db.prepare('UPDATE inventory SET user_id = ?, acquired_at = ? WHERE id = ?')
      .run(receiver.id, Date.now(), invRow.id);

    const stillHas = db.prepare('SELECT 1 FROM inventory WHERE user_id = ? AND item_id = ?').get(sender.id, invRow.item_id);
    if (!stillHas) {
      if (sender.equipped_border_id === invRow.item_id) {
        db.prepare("UPDATE users SET equipped_border_id = '' WHERE id = ?").run(sender.id);
      }
      if (sender.equipped_skin_id === invRow.item_id) {
        db.prepare("UPDATE users SET equipped_skin_id = '' WHERE id = ?").run(sender.id);
      }
      const pinned = parsePinnedGifts(sender.pinned_gift_id);
      if (pinned.includes(invRow.item_id)) {
        const nextPinned = pinned.filter(x => x !== invRow.item_id);
        db.prepare('UPDATE users SET pinned_gift_id = ? WHERE id = ?')
          .run(nextPinned.length ? JSON.stringify(nextPinned) : '', sender.id);
      }
    }

    db.prepare('UPDATE users SET cred = cred + 2 WHERE id = ?').run(sender.id);
  });
  transferTx();

  const publicSender = isAnon ? 'Warga Misterius' : sender.name;
  addFeed(`${publicSender} ngasih hadiah "${itemMeta.name}" ke ${receiver.name}.`);

  const senderDisplay = isAnon
    ? '🕵️ <b>Warga Misterius</b> <i>(Secret Admirer / Anonim)</i>'
    : `<b>${escHtml(sender.name)}</b>${sender.username ? ` (@${escHtml(sender.username)})` : ''}`;
  const receiverTag = receiver.username ? ` (@${escHtml(receiver.username)})` : '';

  // Notif pribadi ke Penerima Gift
  await notifyPrivateUser(
    receiver.id,
    `🎁 <b>KAMU DAPAT HADIAH DARI WARGA!</b>\n\n` +
    `• Dari: ${senderDisplay}\n` +
    `• Item: <b>${escHtml(itemMeta.name)}</b> (${escHtml(itemMeta.rarity)})\n` +
    (note ? `• Pesan: <i>"${escHtml(note)}"</i>\n` : '') +
    `\nItem sudah masuk ke Gudang Barang kamu. Buka PunkID untuk <b>Pin</b> ke kartu!`,
    { buttonText: '🎁 CEK GUDANG & PUNKID', startParam: 'gue' }
  );

  // Struk pribadi ke Pengirim Gift
  await notifyPrivateUser(
    sender.id,
    `🎁 <b>HADIAH ${isAnon ? 'ANONIM ' : ''}TERKIRIM!</b>\n\n` +
    `• Penerima: <b>${escHtml(receiver.name)}</b>${receiverTag}\n` +
    `• Item: <b>${escHtml(itemMeta.name)}</b> (${escHtml(itemMeta.rarity)})\n` +
    `• Mode: <b>${isAnon ? '🕵️ Anonim (Identitas Disembunyikan)' : '👤 Terbuka'}</b>\n` +
    `• Bonus Reputasi: <b>+2 Street Cred</b>`,
    { buttonText: '🪪 BUKA PUNKSHIT.OS', startParam: 'gue' }
  );

  const updatedSender = db.prepare('SELECT * FROM users WHERE id = ?').get(sender.id);
  const updatedInv = db.prepare(
    'SELECT id, item_id AS itemId, acquired_at AS acquiredAt FROM inventory WHERE user_id = ? ORDER BY id DESC'
  ).all(sender.id);

  res.json({
    ok: true,
    message: `Hadiah "${itemMeta.name}" resmi terkirim${isAnon ? ' secara anonim' : ''} ke ${receiver.name}!`,
    user: formatUser(updatedSender),
    inv: updatedInv
  });
});
