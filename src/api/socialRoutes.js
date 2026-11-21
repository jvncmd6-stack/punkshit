import { Router } from 'express';
import crypto from 'crypto';
import { InputFile, InlineKeyboard } from 'grammy';
import path from 'path';
import { ENV } from '../config/env.js';
import { db } from '../database/db.js';
import { requireUser } from '../middlewares/authTma.js';
import { uploadMem, processAndSaveImage } from '../middlewares/upload.js';
import { formatUser, getBot, broadcastToTelegram, escHtml } from '../services/syncEngine.js';

export const socialRouter = Router();

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
  CREATE TABLE IF NOT EXISTS shop_items (
    id TEXT PRIMARY KEY,
    seller_id TEXT NOT NULL,
    seller_name TEXT NOT NULL,
    seller_avatar TEXT DEFAULT '',
    title TEXT NOT NULL,
    price INTEGER NOT NULL,
    category TEXT DEFAULT 'Etalase',
    image_url TEXT DEFAULT '',
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'available',
    buyer_id TEXT DEFAULT '',
    buyer_name TEXT DEFAULT '',
    sold_at INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS shop_orders (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    item_title TEXT NOT NULL,
    category TEXT DEFAULT 'Etalase',
    price INTEGER NOT NULL,
    seller_id TEXT NOT NULL,
    seller_name TEXT NOT NULL,
    buyer_id TEXT NOT NULL,
    buyer_name TEXT NOT NULL,
    note TEXT DEFAULT '',
    created_at INTEGER NOT NULL
  );
`);

try { db.exec("ALTER TABLE radio_queue ADD COLUMN source_type TEXT DEFAULT 'spotify'"); } catch (e) {}
try { db.exec("ALTER TABLE radio_queue ADD COLUMN file_id TEXT DEFAULT ''"); } catch (e) {}
try { db.exec("ALTER TABLE shop_items ADD COLUMN status TEXT DEFAULT 'available'"); } catch (e) {}
try { db.exec("ALTER TABLE shop_items ADD COLUMN buyer_id TEXT DEFAULT ''"); } catch (e) {}
try { db.exec("ALTER TABLE shop_items ADD COLUMN buyer_name TEXT DEFAULT ''"); } catch (e) {}
try { db.exec("ALTER TABLE shop_items ADD COLUMN sold_at INTEGER DEFAULT 0"); } catch (e) {}

// GET /api/rules-help -> Ambil teks Pasal & Help dinamis dari setting bot untuk WebApp
socialRouter.get('/rules-help', (req, res) => {
  const pasalRow = db.prepare("SELECT value FROM bot_settings WHERE key = 'pasal_text'").get();
  const helpRow = db.prepare("SELECT value FROM bot_settings WHERE key = 'help_text'").get();

  res.json({
    pasal: pasalRow ? pasalRow.value : '1. Saling hargai sesama warga markas.\n2. Dilarang spam link judi, scam, atau SARA.\n3. Gunakan fitur Radio Gang dengan tertib saat OS.',
    help: helpRow ? helpRow.value : '• Cetak PunkID di menu utama.\n• Request lagu Spotify lewat Radio Gang atau kirim MP3 langsung ke PC Bot Mas Raka.'
  });
});

// GET /api/shop -> Etalase Toko Warga + Riwayat Order User
socialRouter.get('/shop', (req, res) => {
  const items = db.prepare(`
    SELECT * FROM shop_items
    ORDER BY CASE WHEN status = 'available' THEN 0 ELSE 1 END ASC, created_at DESC
    LIMIT 50
  `).all();

  const authUser = req.user || req.tgUser || res.locals?.user;
  let orders = [];
  if (authUser && authUser.id) {
    const uid = String(authUser.id);
    orders = db.prepare(`
      SELECT * FROM shop_orders
      WHERE buyer_id = ? OR seller_id = ?
      ORDER BY created_at DESC
      LIMIT 25
    `).all(uid, uid);
  }

  res.json({ items, orders });
});

// POST /api/shop -> Tambah produk/jasa ke etalase Lapak Warga
socialRouter.post('/shop', requireUser, uploadMem.single('media'), async (req, res) => {
  try {
    const title = String(req.body?.title || '').trim().slice(0, 60);
    const price = Math.max(1, Math.floor(Number(req.body?.price) || 0));
    const category = String(req.body?.category || 'Barang').trim().slice(0, 30);
    const description = String(req.body?.description || '').trim().slice(0, 220);

    if (title.length < 3) {
      return res.status(400).json({ error: 'Nama produk/jasa minimal 3 karakter cuy.' });
    }
    if (price < 1 || price > 100000) {
      return res.status(400).json({ error: 'Harga harus antara 1 sampai 100.000 PSC.' });
    }

    let imageUrl = '';
    if (req.file) {
      imageUrl = await processAndSaveImage(req.file, 'shop', { width: 1080, height: 1080, fit: 'inside' });
    }

    const id = 'sh_' + crypto.randomBytes(4).toString('hex');
    const sellerAvatar = req.dbUser.photo_url || req.dbUser.avatar || '';

    db.prepare(`
      INSERT INTO shop_items (id, seller_id, seller_name, seller_avatar, title, price, category, image_url, description, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'available', ?)
    `).run(id, req.dbUser.id, req.dbUser.name, sellerAvatar, title, price, category, imageUrl, description, Date.now());

    res.json({ ok: true, id, imageUrl });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Gagal pajang produk di lapak.' });
  }
});

// POST /api/warga-shop/buy -> Beli item/jasa dari Lapak Warga (Potong PSC pembeli -> Masuk ke penjual)
socialRouter.post('/warga-shop/buy', requireUser, async (req, res) => {
  const buyer = req.dbUser;
  const itemId = String(req.body?.itemId || '').trim();
  const note = String(req.body?.note || '').trim().slice(0, 120);

  const item = db.prepare('SELECT * FROM shop_items WHERE id = ?').get(itemId);
  if (!item) {
    return res.status(404).json({ error: 'Produk atau jasa tidak ditemukan di etalase.' });
  }
  if (item.status === 'sold') {
    return res.status(400).json({ error: 'Yah telat! Barang ini sudah dibeli warga lain.' });
  }
  if (String(item.seller_id) === String(buyer.id)) {
    return res.status(400).json({ error: 'Nggak bisa beli dagangan sendiri bro!' });
  }
  if ((buyer.psc || 0) < item.price) {
    return res.status(400).json({ error: `Saldo PSC kurang! Butuh ${item.price} PSC, saldo lu ${buyer.psc || 0} PSC.` });
  }

  const seller = db.prepare('SELECT * FROM users WHERE id = ?').get(String(item.seller_id));
  if (!seller) {
    return res.status(404).json({ error: 'Akun pelapak sudah tidak aktif.' });
  }

  const orderId = 'ord_' + crypto.randomBytes(4).toString('hex');
  const now = Date.now();
  // Jika kategori "Jasa", tetap terbuka untuk dipesan warga lain; jika Barang/Stiker, tandai terjual
  const nextStatus = item.category === 'Jasa' ? 'available' : 'sold';

  const tx = db.transaction(() => {
    db.prepare('UPDATE users SET psc = psc - ? WHERE id = ?').run(item.price, buyer.id);
    db.prepare('UPDATE users SET psc = psc + ? WHERE id = ?').run(item.price, seller.id);

    db.prepare(`
      UPDATE shop_items
      SET status = ?, buyer_id = ?, buyer_name = ?, sold_at = ?
      WHERE id = ?
    `).run(nextStatus, buyer.id, buyer.name, now, item.id);

    db.prepare(`
      INSERT INTO shop_orders (id, item_id, item_title, category, price, seller_id, seller_name, buyer_id, buyer_name, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(orderId, item.id, item.title, item.category, item.price, seller.id, seller.name, buyer.id, buyer.name, note, now);

    db.prepare('INSERT INTO transactions (user_id, type, amount, note, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(buyer.id, 'lapak_buy', -item.price, `Beli "${item.title}" dari ${seller.name}`, now);

    db.prepare('INSERT INTO transactions (user_id, type, amount, note, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(seller.id, 'lapak_sell', item.price, `Terjual "${item.title}" ke ${buyer.name}`, now);
  });
  tx();

  // Kirim DM ke penjual via Bot Mas Raka agar langsung diproses
  const bot = getBot();
  if (bot && seller.id) {
    const buyerTag = buyer.username ? `@${escHtml(buyer.username)}` : `<b>${escHtml(buyer.name)}</b>`;
    const dmText =
      `🛍️ <b>ORDERAN LAPAK WARGA MASUK!</b>\n\n` +
      `• Item: <b>${escHtml(item.title)}</b> (${escHtml(item.category)})\n` +
      `• Harga: <b>+${item.price} PSC</b> (otomatis masuk dompet)\n` +
      `• Pembeli: <b>${escHtml(buyer.name)}</b> (${buyerTag})\n` +
      (note ? `• Catatan Pembeli: <i>"${escHtml(note)}"</i>\n` : '') +
      `\nSegera hubungi pembeli buat serah terima barang/jasanya!`;

    const kb = new InlineKeyboard().url('🪪 BUKA LAPAK WARGA', `${ENV.MINIAPP_LINK}?startapp=lapakwarga`);
    bot.api.sendMessage(seller.id, dmText, { parse_mode: 'HTML', reply_markup: kb }).catch(() => {});
  }

  await broadcastToTelegram({
    target: 'group',
    text: `🛍️ <b>TRANSAKSI LAPAK WARGA!</b>\n<b>${escHtml(buyer.name)}</b> baru saja membeli <b>${escHtml(item.title)}</b> dari lapak <b>${escHtml(seller.name)}</b> seharga <b>${item.price} PSC</b>!`,
    buttonText: '🛍️ CEK LAPAK WARGA',
    startParam: 'lapakwarga',
    feedText: `${buyer.name} membeli "${item.title}" dari ${seller.name} (${item.price} PSC).`
  });

  const updatedBuyer = db.prepare('SELECT * FROM users WHERE id = ?').get(buyer.id);
  const items = db.prepare(`
    SELECT * FROM shop_items
    ORDER BY CASE WHEN status = 'available' THEN 0 ELSE 1 END ASC, created_at DESC
    LIMIT 50
  `).all();
  const orders = db.prepare(`
    SELECT * FROM shop_orders
    WHERE buyer_id = ? OR seller_id = ?
    ORDER BY created_at DESC
    LIMIT 25
  `).all(buyer.id, buyer.id);

  res.json({
    ok: true,
    orderId,
    message: `Berhasil membeli "${item.title}"! Saldo -${item.price} PSC.`,
    user: formatUser(updatedBuyer),
    items,
    orders
  });
});

// POST /api/warga-shop/delete -> Hapus dagangan sendiri dari etalase
socialRouter.post('/warga-shop/delete', requireUser, (req, res) => {
  const itemId = String(req.body?.itemId || '').trim();
  const item = db.prepare('SELECT * FROM shop_items WHERE id = ?').get(itemId);

  if (!item) return res.status(404).json({ error: 'Item tidak ditemukan.' });
  if (String(item.seller_id) !== String(req.dbUser.id)) {
    return res.status(403).json({ error: 'Lu cuma bisa hapus dagangan milik sendiri.' });
  }

  db.prepare('DELETE FROM shop_items WHERE id = ?').run(itemId);
  const items = db.prepare(`
    SELECT * FROM shop_items
    ORDER BY CASE WHEN status = 'available' THEN 0 ELSE 1 END ASC, created_at DESC
    LIMIT 50
  `).all();

  res.json({ ok: true, items });
});

// POST /api/social/greet -> Sapa warga lain di Grup
socialRouter.post('/social/greet', requireUser, async (req, res) => {
  const targetId = String(req.body?.targetUserId || '');
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
  if (!target) return res.status(404).json({ error: 'Warga tidak ditemukan.' });

  await broadcastToTelegram({
    target: 'group',
    text: `<b>SAPAAN MARKAS</b>\n<b>${escHtml(req.dbUser.name)}</b> nyapa <b>${escHtml(target.name)}</b>${target.username ? ` (@${escHtml(target.username)})` : ''} di PUNKSHIT.OS.`,
    buttonText: 'CEK WARGA',
    startParam: 'warga',
    feedText: `${req.dbUser.name} menyapa ${target.name} di markas.`
  });

  res.json({ ok: true });
});

// POST /api/wanted -> Pasang Wanted Board & lempar ke Grup
socialRouter.post('/wanted', requireUser, async (req, res) => {
  const category = String(req.body?.category || 'Gas Mabar').trim().slice(0, 30);
  const slots = Math.max(2, Math.min(10, Number(req.body?.slots) || 3));
  const note = String(req.body?.note || '').trim().slice(0, 90);
  if (note.length < 3) return res.status(400).json({ error: 'Catatan terlalu pendek.' });

  const id = 'wt_' + crypto.randomBytes(4).toString('hex');
  const now = Date.now();

  const tx = db.transaction(() => {
    db.prepare('INSERT INTO wanted (id, author_id, author_name, category, slots, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, req.dbUser.id, req.dbUser.name, category, slots, note, now);
    db.prepare('INSERT INTO wanted_joins (wanted_id, user_id, joined_at) VALUES (?, ?, ?)').run(id, req.dbUser.id, now);
  });
  tx();

  await broadcastToTelegram({
    target: 'group',
    text:
      `<b>WANTED: ${escHtml(category.toUpperCase())}</b>\n` +
      `Oleh: <b>${escHtml(req.dbUser.name)}</b>\n` +
      `Slot: <b>1/${slots} warga</b>\n\n` +
      `<i>"${escHtml(note)}"</i>`,
    buttonText: 'GABUNG KOMPLOTAN',
    startParam: 'wanted',
    feedText: `${req.dbUser.name} buka Wanted: ${category} (${note}).`
  });

  const wanted = db.prepare('SELECT * FROM wanted ORDER BY created_at DESC LIMIT 15').all().map((w) => ({
    id: w.id,
    authorId: w.author_id,
    authorName: w.author_name,
    category: w.category,
    slots: w.slots,
    note: w.note,
    joined: db.prepare('SELECT COUNT(*) AS c FROM wanted_joins WHERE wanted_id = ?').get(w.id).c
  }));

  res.json({ wanted });
});

// POST /api/wanted/join -> Gabung komplotan Wanted Board
socialRouter.post('/wanted/join', requireUser, (req, res) => {
  const wid = String(req.body?.wantedId || '');
  const item = db.prepare('SELECT * FROM wanted WHERE id = ?').get(wid);
  if (!item) return res.status(404).json({ error: 'Lowongan sudah ditutup.' });

  const count = db.prepare('SELECT COUNT(*) AS c FROM wanted_joins WHERE wanted_id = ?').get(wid).c;
  if (count >= item.slots) return res.status(400).json({ error: 'Slot komplotan sudah penuh!' });

  const already = db.prepare('SELECT 1 FROM wanted_joins WHERE wanted_id = ? AND user_id = ?').get(wid, req.dbUser.id);
  if (already) return res.status(400).json({ error: 'Lu sudah terdaftar di komplotan ini.' });

  db.prepare('INSERT INTO wanted_joins (wanted_id, user_id, joined_at) VALUES (?, ?, ?)').run(wid, req.dbUser.id, Date.now());

  const wanted = db.prepare('SELECT * FROM wanted ORDER BY created_at DESC LIMIT 15').all().map((w) => ({
    id: w.id,
    authorId: w.author_id,
    authorName: w.author_name,
    category: w.category,
    slots: w.slots,
    note: w.note,
    joined: db.prepare('SELECT COUNT(*) AS c FROM wanted_joins WHERE wanted_id = ?').get(w.id).c
  }));

  res.json({ wanted });
});

// POST /api/menfess -> Kirim Kotak Rahasia
socialRouter.post('/menfess', requireUser, (req, res) => {
  const category = String(req.body?.category || 'Confession').trim().slice(0, 30);
  const text = String(req.body?.text || '').trim().slice(0, 280);
  if (text.length < 5) return res.status(400).json({ error: 'Pesan minimal 5 karakter.' });

  const id = 'mf_' + crypto.randomBytes(4).toString('hex');
  db.prepare('INSERT INTO menfess (id, sender_id, category, text, status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, req.dbUser.id, category, text, 'pending', Date.now());

  res.json({ ok: true });
});

// POST /api/polls/vote -> Sidang Warga
socialRouter.post('/polls/vote', requireUser, (req, res) => {
  const pollId = String(req.body?.pollId || '');
  const idx = Number(req.body?.optionIndex);
  const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(pollId);
  if (!poll) return res.status(404).json({ error: 'Sidang tidak ditemukan.' });

  const opts = JSON.parse(poll.options_json || '[]');
  if (!opts[idx]) return res.status(400).json({ error: 'Pilihan tidak valid.' });

  const voted = db.prepare('SELECT 1 FROM poll_votes WHERE poll_id = ? AND user_id = ?').get(pollId, req.dbUser.id);
  if (voted) return res.status(400).json({ error: 'Lu sudah memberikan suara di sidang ini.' });

  const tx = db.transaction(() => {
    opts[idx].votes = (opts[idx].votes || 0) + 1;
    db.prepare('UPDATE polls SET options_json = ? WHERE id = ?').run(JSON.stringify(opts), pollId);
    db.prepare('INSERT INTO poll_votes (poll_id, user_id, option_index) VALUES (?, ?, ?)').run(pollId, req.dbUser.id, idx);
    db.prepare('UPDATE users SET cred = cred + 2 WHERE id = ?').run(req.dbUser.id);
  });
  tx();

  const polls = db.prepare('SELECT * FROM polls ORDER BY created_at DESC LIMIT 10').all().map((p) => {
    const o = JSON.parse(p.options_json || '[]');
    return { id: p.id, question: p.question, options: o, totalVotes: o.reduce((a, b) => a + (b.votes || 0), 0) };
  });

  res.json({ polls });
});

// GET /api/radio/queue -> Ambil daftar antrean request lagu untuk WebApp
socialRouter.get('/radio/queue', (req, res) => {
  const list = db.prepare(`
    SELECT id, user_name AS userName, source_type AS sourceType, song, link, message, created_at AS createdAt
    FROM radio_queue
    WHERE status = 'waiting'
    ORDER BY id ASC
    LIMIT 25
  `).all();
  res.json({ list });
});

// POST /api/radio -> Request lagu wajib link Spotify -> Masuk Channel Gudang & Antrean OS
socialRouter.post('/radio', requireUser, async (req, res) => {
  const song = String(req.body?.song || '').trim().slice(0, 80);
  const link = String(req.body?.link || '').trim().slice(0, 180);
  const message = String(req.body?.message || '').trim().slice(0, 100);

  if (song.length < 3) {
    return res.status(400).json({ error: 'Judul lagu wajib diisi.' });
  }
  if (!/^https:\/\/open\.spotify\.com\//.test(link)) {
    return res.status(400).json({ error: 'Wajib menyertakan link Spotify (https://open.spotify.com/...) atau kirim file MP3 langsung ke PC Bot.' });
  }

  const info = db.prepare(`
    INSERT INTO radio_queue (user_id, user_name, source_type, song, link, file_id, message, status, created_at)
    VALUES (?, ?, 'spotify', ?, ?, '', ?, 'waiting', ?)
  `).run(req.dbUser.id, req.dbUser.name, song, link, message, Date.now());

  const reqId = info.lastInsertRowid;
  const waitingCount = db.prepare("SELECT COUNT(*) AS c FROM radio_queue WHERE status = 'waiting'").get().c;
  const warehouseId = (process.env.WAREHOUSE_CHANNEL_ID || '').trim();
  const bot = getBot();

  if (bot && warehouseId) {
    try {
      const kb = new InlineKeyboard().url('Buka di Spotify', link);
      await bot.api.sendMessage(
        warehouseId,
        `<b>GUDANG MUSIK — REQUEST SPOTIFY #${reqId}</b>\n` +
        `Judul: <b>${escHtml(song)}</b>\n` +
        `Dari: <b>${escHtml(req.dbUser.name)}</b>\n` +
        `Link: ${escHtml(link)}` +
        (message ? `\nTitip salam: <i>"${escHtml(message)}"</i>` : ''),
        { parse_mode: 'HTML', reply_markup: kb }
      );
    } catch (whErr) {
      console.error('[Warehouse Spotify Broadcast Error]:', whErr.message);
    }
  }

  await broadcastToTelegram({
    target: 'group',
    text:
      `<b>RADIO GANG — REQUEST #${reqId}</b>\n` +
      `Dari: <b>${escHtml(req.dbUser.name)}</b>\n` +
      `Lagu: <b>${escHtml(song)}</b>\n` +
      `Link: ${escHtml(link)}\n` +
      (message ? `Titip salam: <i>"${escHtml(message)}"</i>\n` : '') +
      `\nTotal antrean OS: <b>${waitingCount} lagu</b>`,
    buttonText: 'REQUEST LAGU',
    startParam: 'radio',
    feedText: `${req.dbUser.name} request lagu "${song}" (Antrean #${reqId}).`
  });

  res.json({ ok: true, id: reqId, queueCount: waitingCount });
});

// POST /api/events/rsvp -> Ikut Rusuh (RSVP Event)
socialRouter.post('/events/rsvp', requireUser, (req, res) => {
  const eventId = String(req.body?.eventId || '');
  const ev = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  if (!ev) return res.status(404).json({ error: 'Event tidak ditemukan.' });

  db.prepare('INSERT OR IGNORE INTO event_rsvps (event_id, user_id, joined_at) VALUES (?, ?, ?)')
    .run(eventId, req.dbUser.id, Date.now());

  const events = db.prepare('SELECT * FROM events ORDER BY created_at DESC LIMIT 15').all().map((e) => ({
    id: e.id,
    type: e.type,
    title: e.title,
    dateText: e.date_text,
    description: e.description,
    rewardText: e.reward_text,
    rsvpCount: db.prepare('SELECT COUNT(*) AS c FROM event_rsvps WHERE event_id = ?').get(e.id).c,
    joined: Boolean(db.prepare('SELECT 1 FROM event_rsvps WHERE event_id = ? AND user_id = ?').get(e.id, req.dbUser.id))
  }));

  res.json({ events });
});

// POST /api/capsule -> Simpan Time Capsule
socialRouter.post('/capsule', requireUser, (req, res) => {
  const unlockDate = String(req.body?.unlockDate || '').trim();
  const message = String(req.body?.message || '').trim().slice(0, 300);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(unlockDate) || message.length < 5) {
    return res.status(400).json({ error: 'Tanggal dan isi pesan harus valid.' });
  }

  db.prepare('INSERT INTO capsules (user_id, unlock_date, message, created_at) VALUES (?, ?, ?, ?)')
    .run(req.dbUser.id, unlockDate, message, Date.now());

  res.json({ ok: true });
});

// POST /api/meme -> Upload meme (JPG/PNG/GIF/WebM) ke server & kirim ke Grup Telegram
socialRouter.post('/meme', requireUser, uploadMem.single('meme'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Pilih file gambar, GIF, atau WebM dulu cuy.' });
    }

    const publicPath = await processAndSaveImage(req.file, 'memes', { width: 1080, height: 1080, fit: 'inside' });
    const caption = String(req.body?.caption || '').trim().slice(0, 90);

    const bot = getBot();
    if (bot && ENV.GROUP_ID) {
      try {
        const uploadBase = ENV.UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads');
        const localFile = path.join(uploadBase, 'memes', path.basename(publicPath));
        const kb = new InlineKeyboard().url('KIRIM MEME DI WEB', `${ENV.MINIAPP_LINK}?startapp=meme`);
        const isAnim = /\.(gif|webm)$/i.test(publicPath);

        if (isAnim) {
          await bot.api.sendAnimation(ENV.GROUP_ID, new InputFile(localFile), {
            caption: `<b>MEME BARU</b>\nDari: <b>${escHtml(req.dbUser.name)}</b>` + (caption ? `\n<i>${escHtml(caption)}</i>` : ''),
            parse_mode: 'HTML',
            reply_markup: kb
          });
        } else {
          await bot.api.sendPhoto(ENV.GROUP_ID, new InputFile(localFile), {
            caption: `<b>MEME BARU</b>\nDari: <b>${escHtml(req.dbUser.name)}</b>` + (caption ? `\n<i>${escHtml(caption)}</i>` : ''),
            parse_mode: 'HTML',
            reply_markup: kb
          });
        }
      } catch (botErr) {
        console.error('[Meme Telegram Broadcast Error]:', botErr.message);
      }
    }

    res.json({ ok: true, imageUrl: publicPath });
  } catch (err) {
    console.error('[Meme Upload Error]:', err);
    res.status(400).json({ error: err.message || 'Gagal memproses file.' });
  }
});
