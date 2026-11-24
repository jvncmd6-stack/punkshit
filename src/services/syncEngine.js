import { Router } from 'express';
import crypto from 'crypto';
import { db, addFeed, addAuditLog } from '../database/db.js';
import { requireUser } from '../middlewares/authTma.js';
import { uploadMem, processAndSaveImage } from '../middlewares/upload.js';
import { broadcastToTelegram, notifyPrivateUser, escHtml } from '../services/syncEngine.js';

export const marketRouter = Router();

function getShopSnapshot(userId) {
  const items = db.prepare(`
    SELECT * FROM warga_shop_items
    WHERE status != 'deleted'
    ORDER BY (CASE WHEN boosted_until > ? THEN 1 ELSE 0 END) DESC, created_at DESC
    LIMIT 60
  `).all(Date.now());

  const orders = userId
    ? db.prepare(`
        SELECT * FROM warga_shop_orders
        WHERE buyer_id = ? OR seller_id = ?
        ORDER BY created_at DESC LIMIT 30
      `).all(String(userId), String(userId))
    : [];

  return { items, orders };
}

function getFreshUser(userId) {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(String(userId));
  if (!row) return null;
  return {
    ...row,
    photoUrl: row.photo_url,
    bannerUrl: row.banner_url,
    memberNo: row.member_no,
    equippedBorderId: row.equipped_border_id,
    equippedSkinId: row.equipped_skin_id,
    pinnedGiftId: row.pinned_gift_id
  };
}

// GET /api/shop -> Ambil etalase Lapak Warga + riwayat order
marketRouter.get('/shop', requireUser, (req, res) => {
  res.json(getShopSnapshot(req.dbUser.id));
});

// POST /api/shop -> Pajang produk baru ke Lapak Warga (dengan stok)
marketRouter.post('/shop', requireUser, uploadMem.single('media'), async (req, res) => {
  try {
    const u = req.dbUser;
    const title = String(req.body?.title || '').trim().slice(0, 60);
    const price = Math.max(1, Math.min(100000, parseInt(req.body?.price, 10) || 0));
    const category = String(req.body?.category || 'Barang').trim().slice(0, 30);
    const description = String(req.body?.description || '').trim().slice(0, 220);
    let stock = parseInt(req.body?.stock, 10);
    if (Number.isNaN(stock)) stock = category === 'Jasa' ? -1 : 1;
    stock = Math.max(-1, Math.min(999, stock));

    if (title.length < 3 || !price) {
      return res.status(400).json({ error: 'Nama produk minimal 3 huruf & harga wajib diisi.' });
    }

    const activeCount = db.prepare(`SELECT COUNT(*) AS c FROM warga_shop_items WHERE seller_id = ? AND status = 'open'`).get(String(u.id)).c;
    if (activeCount >= 8) {
      return res.status(400).json({ error: 'Maksimal 8 produk aktif di etalase. Hapus atau habiskan dulu yang lama.' });
    }

    const id = 'ws_' + crypto.randomBytes(4).toString('hex');
    const imageUrl = req.file
      ? await processAndSaveImage(req.file, 'shop', { width: 900, height: 900, fit: 'inside' })
      : '';
    const now = Date.now();

    db.prepare(`
      INSERT INTO warga_shop_items (id, seller_id, seller_name, seller_username, category, title, price, stock, description, image_url, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)
    `).run(id, String(u.id), u.name, u.username || '', category, title, price, stock, description, imageUrl, now);

    addFeed(`${u.name} buka lapak baru: ${title} (${price} PSC).`);
    await broadcastToTelegram({
      target: 'group',
      text: `🏪 <b>LAPAK WARGA BARU!</b>\n• Produk: <b>${escHtml(title)}</b> (${escHtml(category)})\n• Harga: <b>${price} PSC</b> · Stok: <b>${stock < 0 ? 'Unlimited' : stock}</b>\n• Pelapak: ${u.username ? '@' + escHtml(u.username) : escHtml(u.name)}`,
      buttonText: '🛍️ INTIP ETALASE',
      startParam: 'lapak'
    });

    res.json({ ok: true, id, ...getShopSnapshot(u.id) });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Gagal memasang produk.' });
  }
});

// POST /api/warga-shop/edit -> Edit harga, judul, deskripsi, & restock barang
marketRouter.post('/warga-shop/edit', requireUser, (req, res) => {
  const u = req.dbUser;
  const itemId = String(req.body?.itemId || '');
  const item = db.prepare('SELECT * FROM warga_shop_items WHERE id = ?').get(itemId);
  if (!item) return res.status(404).json({ error: 'Produk tidak ditemukan.' });

  const isAdmin = u.role === 'owner' || u.role === 'admin';
  if (String(item.seller_id) !== String(u.id) && !isAdmin) {
    return res.status(403).json({ error: 'Bukan produk lo cuy!' });
  }

  const title = String(req.body?.title || item.title).trim().slice(0, 60);
  const price = Math.max(1, Math.min(100000, parseInt(req.body?.price, 10) || item.price));
  const description = String(req.body?.description ?? item.description).trim().slice(0, 220);
  let stock = parseInt(req.body?.stock, 10);
  if (Number.isNaN(stock)) stock = item.stock;
  stock = Math.max(-1, Math.min(999, stock));

  const nextStatus = (stock === 0) ? 'sold' : 'open';

  db.prepare(`
    UPDATE warga_shop_items
    SET title = ?, price = ?, description = ?, stock = ?, status = ?
    WHERE id = ?
  `).run(title, price, description, stock, nextStatus, itemId);

  res.json({ ok: true, ...getShopSnapshot(u.id) });
});

// POST /api/warga-shop/boost -> Sundul produk ke paling atas etalase (15 PSC / 12 jam)
marketRouter.post('/warga-shop/boost', requireUser, (req, res) => {
  const u = req.dbUser;
  const itemId = String(req.body?.itemId || '');
  const item = db.prepare('SELECT * FROM warga_shop_items WHERE id = ?').get(itemId);
  if (!item || String(item.seller_id) !== String(u.id)) {
    return res.status(404).json({ error: 'Produk tidak ditemukan atau bukan milikmu.' });
  }
  if ((u.psc || 0) < 15) {
    return res.status(400).json({ error: 'Saldo kurang! Butuh 15 PSC buat sundul dagangan.' });
  }

  const boostUntil = Date.now() + 12 * 3600 * 1000;
  const tx = db.transaction(() => {
    db.prepare('UPDATE users SET psc = psc - 15 WHERE id = ?').run(String(u.id));
    db.prepare('UPDATE warga_shop_items SET boosted_until = ? WHERE id = ?').run(boostUntil, itemId);
    db.prepare('INSERT INTO transactions (user_id, type, amount, note, created_at) VALUES (?, ?, ?, ?, ?)').run(String(u.id), 'boost', -15, `Sundul: ${item.title}`, Date.now());
  });
  tx();

  res.json({ ok: true, user: getFreshUser(u.id), ...getShopSnapshot(u.id) });
});

// POST /api/warga-shop/buy -> Beli produk warga (potong stok + pajak 5%, notif PM bot only)
marketRouter.post('/warga-shop/buy', requireUser, async (req, res) => {
  const buyer = req.dbUser;
  const itemId = String(req.body?.itemId || '');
  const note = String(req.body?.note || '').trim().slice(0, 100);
  const item = db.prepare('SELECT * FROM warga_shop_items WHERE id = ?').get(itemId);

  if (!item || item.status === 'deleted') return res.status(404).json({ error: 'Produk tidak tersedia.' });
  if (String(item.seller_id) === String(buyer.id)) return res.status(400).json({ error: 'Masa beli dagangan sendiri?' });
  if (item.status === 'sold' || item.stock === 0) return res.status(400).json({ error: 'Stok produk sudah habis!' });
  if ((buyer.psc || 0) < item.price) return res.status(400).json({ error: 'Saldo PSC tidak cukup!' });

  const fee = Math.floor(item.price * 0.05);
  const sellerNet = Math.max(1, item.price - fee);
  const orderId = 'ord_' + crypto.randomBytes(4).toString('hex');
  const now = Date.now();

  const tx = db.transaction(() => {
    db.prepare('UPDATE users SET psc = psc - ? WHERE id = ?').run(item.price, String(buyer.id));
    db.prepare('UPDATE users SET psc = psc + ? WHERE id = ?').run(sellerNet, String(item.seller_id));

    const newStock = item.stock > 0 ? item.stock - 1 : -1;
    const newStatus = newStock === 0 ? 'sold' : 'open';
    db.prepare(`
      UPDATE warga_shop_items
      SET stock = ?, sold_count = sold_count + 1, status = ?, buyer_name = ?
      WHERE id = ?
    `).run(newStock, newStatus, buyer.name, itemId);

    db.prepare(`
      INSERT INTO warga_shop_orders (id, item_id, item_title, seller_id, seller_name, buyer_id, buyer_name, price, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(orderId, item.id, item.title, item.seller_id, item.seller_name, String(buyer.id), buyer.name, item.price, note, now);

    db.prepare('INSERT INTO transactions (user_id, type, amount, note, created_at) VALUES (?, ?, ?, ?, ?)').run(String(buyer.id), 'market_buy', -item.price, `Beli: ${item.title}`, now);
    db.prepare('INSERT INTO transactions (user_id, type, amount, note, created_at) VALUES (?, ?, ?, ?, ?)').run(String(item.seller_id), 'market_sell', sellerNet, `Laku: ${item.title} (potong pajak 5%)`, now);
  });
  tx();

  const sellerRow = db.prepare('SELECT id, username, name FROM users WHERE id = ?').get(String(item.seller_id));
  const buyerRow = db.prepare('SELECT id, username, name FROM users WHERE id = ?').get(String(buyer.id));

  const sellerUsn = String(sellerRow?.username || item.seller_username || '').replace(/^@/, '').trim();
  const buyerUsn = String(buyerRow?.username || buyer.username || '').replace(/^@/, '').trim();
  const noteLine = note ? `\n• Catatan: <i>${escHtml(note)}</i>` : '';

  // 1. Kirim PM Bot ke PEMBELI & arahkan langsung ke @username penjual
  await notifyPrivateUser(
    buyer.id,
    `🛒 <b>TRANSAKSI LAPAK WARGA BERHASIL!</b>\n` +
    `• ID Order: <code>${orderId}</code>\n` +
    `• Produk: <b>${escHtml(item.title)}</b>\n` +
    `• Total Bayar: <b>${item.price} PSC</b>\n` +
    `• Penjual: ${sellerUsn ? '@' + escHtml(sellerUsn) : escHtml(sellerRow?.name || item.seller_name)}` +
    `${noteLine}\n\n` +
    `Silakan hubungi penjual di atas untuk serah-terima item/jasa.`,
    {
      buttonText: sellerUsn ? `💬 CHAT PENJUAL (@${sellerUsn})` : '🧾 CEK ORDER',
      buttonUrl: sellerUsn ? `https://t.me/${sellerUsn}` : '',
      startParam: 'lapak'
    }
  );

  // 2. Kirim PM Bot ke PENJUAL & arahkan langsung ke @username pembeli
  await notifyPrivateUser(
    item.seller_id,
    `💰 <b>DAGANGAN LAPAK WARGA TERJUAL!</b>\n` +
    `• ID Order: <code>${orderId}</code>\n` +
    `• Produk: <b>${escHtml(item.title)}</b>\n` +
    `• Pendapatan Bersih: <b>+${sellerNet} PSC</b> (pajak 5%)\n` +
    `• Pembeli: ${buyerUsn ? '@' + escHtml(buyerUsn) : escHtml(buyerRow?.name || buyer.name)}` +
    `${noteLine}\n\n` +
    `Pembeli sudah diarahkan ke username kamu lewat bot.`,
    {
      buttonText: buyerUsn ? `📩 CHAT PEMBELI (@${buyerUsn})` : '🧾 CEK ORDER',
      buttonUrl: buyerUsn ? `https://t.me/${buyerUsn}` : '',
      startParam: 'lapak'
    }
  );

  res.json({
    ok: true,
    orderId,
    sellerUsername: sellerUsn,
    message: sellerUsn
      ? `Berhasil beli ${item.title}! Cek PM Bot atau langsung chat @${sellerUsn}.`
      : `Berhasil beli ${item.title}! Detail pesanan sudah dikirim via PM Bot.`,
    user: getFreshUser(buyer.id),
    ...getShopSnapshot(buyer.id)
  });
});

// POST /api/warga-shop/delete -> Hapus dagangan
marketRouter.post('/warga-shop/delete', requireUser, (req, res) => {
  const u = req.dbUser;
  const itemId = String(req.body?.itemId || '');
  const item = db.prepare('SELECT * FROM warga_shop_items WHERE id = ?').get(itemId);
  if (!item) return res.status(404).json({ error: 'Produk tidak ditemukan.' });

  const isAdmin = u.role === 'owner' || u.role === 'admin';
  if (String(item.seller_id) !== String(u.id) && !isAdmin) {
    return res.status(403).json({ error: 'Tidak punya akses hapus produk ini.' });
  }

  db.prepare(`UPDATE warga_shop_items SET status = 'deleted' WHERE id = ?`).run(itemId);
  res.json({ ok: true, ...getShopSnapshot(u.id) });
});

// POST /api/shop/collab-submit -> Warga mengajukan item Collab untuk Lapak Rongsok
marketRouter.post('/shop/collab-submit', requireUser, uploadMem.single('media'), async (req, res) => {
  try {
    const u = req.dbUser;
    const type = ['border', 'skin', 'gift'].includes(req.body?.type) ? req.body.type : 'border';
    const name = String(req.body?.name || '').trim().slice(0, 40);
    const price = Math.max(50, Math.min(5000, parseInt(req.body?.price, 10) || 150));
    const desc = String(req.body?.desc || '').trim().slice(0, 140);

    if (name.length < 3 || !req.file) {
      return res.status(400).json({ error: 'Nama item minimal 3 huruf dan wajib upload gambar/WebM desainnya!' });
    }

    const subId = 'col_' + crypto.randomBytes(3).toString('hex');
    const imageUrl = await processAndSaveImage(req.file, 'shop', { width: 512, height: 512, fit: 'inside' });

    db.prepare(`
      INSERT INTO item_submissions (id, creator_id, creator_name, creator_username, type, name, price, desc, image_url, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(subId, String(u.id), u.name, u.username || '', type, name, price, desc, imageUrl, Date.now());

    addAuditLog(u.id, 'COLLAB_SUBMIT', `Ajukan item collab ${name} (${type}) ID: ${subId}`);

    await broadcastToTelegram({
      target: 'group',
      text:
        `🎨 <b>PENGAJUAN ITEM COLLAB BARU!</b>\n` +
        `• ID Pengajuan: <code>${subId}</code>\n` +
        `• Kreator: ${u.username ? '@' + escHtml(u.username) : escHtml(u.name)}\n` +
        `• Kategori: <b>${type.toUpperCase()}</b>\n` +
        `• Nama Item: <b>${escHtml(name)}</b> (${price} PSC)\n\n` +
        `<i>Admin tinggal ketik command bot:</i>\n<code>/acc_collab ${subId}</code> atau <code>/tolak_collab ${subId}</code>`
    });

    res.json({ ok: true, id: subId });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Gagal mengajukan item collab.' });
  }
});
