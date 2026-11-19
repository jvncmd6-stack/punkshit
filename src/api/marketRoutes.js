import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../database/db.js';
import { requireUser } from '../middlewares/authTma.js';
import { broadcastToTelegram, escHtml } from '../services/syncEngine.js';

export const marketRouter = Router();

// Pastikan tabel lapak warga otomatis dibuat jika belum ada
db.exec(`
  CREATE TABLE IF NOT EXISTS member_market (
    id TEXT PRIMARY KEY,
    seller_id TEXT NOT NULL,
    seller_name TEXT NOT NULL,
    seller_username TEXT,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    price TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    created_at INTEGER NOT NULL
  )
`);

// GET /api/market -> Ambil daftar lapak warga yang masih buka
marketRouter.get('/market', (req, res) => {
  const list = db.prepare(`
    SELECT id, seller_id AS sellerId, seller_name AS sellerName, seller_username AS sellerUsername,
           category, title, price, description, status, created_at AS createdAt
    FROM member_market
    WHERE status = 'open'
    ORDER BY created_at DESC
    LIMIT 30
  `).all();

  res.json({ list });
});

// POST /api/market/create -> Buka lapak barang / jasa baru
marketRouter.post('/market/create', requireUser, async (req, res) => {
  const u = req.dbUser;
  const category = req.body?.category === 'Jasa' ? 'Jasa' : 'Barang';
  const title = String(req.body?.title || '').trim().slice(0, 50);
  const price = String(req.body?.price || '').trim().slice(0, 25);
  const description = String(req.body?.description || '').trim().slice(0, 160);

  if (title.length < 3 || !price || description.length < 5) {
    return res.status(400).json({ error: 'Judul, harga, dan deskripsi lapak wajib diisi lengkap.' });
  }

  const id = 'lp_' + crypto.randomBytes(4).toString('hex');
  const now = Date.now();

  db.prepare(`
    INSERT INTO member_market (id, seller_id, seller_name, seller_username, category, title, price, description, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)
  `).run(id, u.id, u.name, u.username || '', category, title, price, description, now);

  const contactText = u.username ? `@${escHtml(u.username)}` : escHtml(u.name);

  await broadcastToTelegram({
    target: 'group',
    text:
      `🏪 <b>LAPAK WARGA BARU BUKA!</b>\n` +
      `• Tipe: <b>${category.toUpperCase()}</b>\n` +
      `• Lapak: <b>${escHtml(title)}</b>\n` +
      `• Mahar: <b>${escHtml(price)}</b>\n` +
      `• Pelapak: ${contactText}\n\n` +
      `💬 <i>"${escHtml(description)}"</i>`,
    buttonText: '🏪 CEK LAPAK WARGA',
    startParam: 'lapak',
    feedText: `${u.name} buka lapak ${category}: ${title} (${price}).`
  });

  res.json({ ok: true, id });
});

// POST /api/market/close -> Tutup / tandai terjual (khusus pemilik lapak atau owner/admin)
marketRouter.post('/market/close', requireUser, (req, res) => {
  const u = req.dbUser;
  const marketId = String(req.body?.marketId || '');
  const item = db.prepare('SELECT * FROM member_market WHERE id = ?').get(marketId);

  if (!item) return res.status(404).json({ error: 'Lapak tidak ditemukan.' });
  const isAdmin = u.role === 'owner' || u.role === 'admin';
  if (item.seller_id !== u.id && !isAdmin) {
    return res.status(403).json({ error: 'Bukan lapak lo bro!' });
  }

  db.prepare(`UPDATE member_market SET status = 'closed' WHERE id = ?`).run(marketId);
  res.json({ ok: true });
});
