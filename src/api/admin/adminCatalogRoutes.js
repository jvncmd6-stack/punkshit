import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../../database/db.js';
import { requireUser } from '../../middlewares/authTma.js';
import { uploadMem, processAndSaveImage } from '../../middlewares/upload.js';
import { broadcastToTelegram, getCatalog, escHtml, notifyPrivateUser } from '../../services/syncEngine.js';
import { isAdminUser, logAudit } from './adminHelpers.js';

export const adminCatalogRouter = Router();

try { db.exec("ALTER TABLE items ADD COLUMN creators_json TEXT DEFAULT ''"); } catch (_) {}
try { db.exec("ALTER TABLE item_submissions ADD COLUMN creators_json TEXT DEFAULT ''"); } catch (_) {}

function extractSubmissionCreators(sub) {
  const list = [];
  const seen = new Set();

  if (sub?.creators_json) {
    try {
      const parsed = typeof sub.creators_json === 'string'
        ? JSON.parse(sub.creators_json)
        : sub.creators_json;
      if (Array.isArray(parsed)) {
        for (const c of parsed) {
          const cid = String(c?.id || '').trim();
          if (cid && !seen.has(cid)) {
            seen.add(cid);
            list.push({
              id: cid,
              name: c.name || 'Warga',
              username: c.username || ''
            });
          }
        }
      }
    } catch (_) {}
  }

  const mainId = String(sub?.creator_id || '').trim();
  if (mainId && !seen.has(mainId)) {
    seen.add(mainId);
    list.push({
      id: mainId,
      name: sub.creator_name || 'Warga',
      username: sub.creator_username || ''
    });
  }

  return list.slice(0, 3);
}

adminCatalogRouter.post('/admin/collab/review', requireUser, async (req, res) => {
  if (!isAdminUser(req.dbUser)) return res.status(403).json({ error: 'Akses ditolak.' });

  const id = String(req.body?.id || '');
  const decision = String(req.body?.decision || 'reject');
  const sub = db.prepare('SELECT * FROM item_submissions WHERE id = ?').get(id);
  if (!sub || sub.status !== 'pending') {
    return res.status(404).json({ error: 'Pengajuan collab tidak ditemukan atau sudah diproses.' });
  }

  const creators = extractSubmissionCreators(sub);
  const creatorLabel = creators.length > 1
    ? creators.map((c) => (c.username ? `@${c.username}` : c.name)).join(' × ')
    : (sub.creator_username ? `@${sub.creator_username}` : sub.creator_name);

  if (decision === 'approve') {
    const itemId = 'collab-' + crypto.randomBytes(3).toString('hex');
    const finalPrice = Number(sub.price) || 100;
    const primaryCreatorId = creators[0]?.id || String(sub.creator_id || '').trim();
    const fullDesc = `${sub.desc || 'Item spesial kolaborasi warga.'} (Collab by ${creatorLabel})`;
    const now = Date.now();

    db.transaction(() => {
      db.prepare(`
        INSERT INTO items (id, type, name, price, rarity, stock, desc, image_url, creator_id, creator_name, creators_json, is_collab, created_at)
        VALUES (?, ?, ?, ?, 'Collab', -1, ?, ?, ?, ?, ?, 1, ?)
      `).run(
        itemId,
        sub.type,
        sub.name,
        finalPrice,
        fullDesc,
        sub.image_url || '',
        primaryCreatorId,
        creatorLabel,
        JSON.stringify(creators),
        now
      );

      db.prepare("UPDATE item_submissions SET status = 'approved', reviewed_by = ? WHERE id = ?")
        .run(String(req.dbUser.id), id);

      const insInv = db.prepare('INSERT INTO inventory (user_id, item_id, acquired_at) VALUES (?, ?, ?)');
      creators.forEach((cr, idx) => {
        insInv.run(cr.id, itemId, now + idx);
      });
    })();

    logAudit(req.dbUser.id, 'ACC COLLAB', `Setujui ${sub.name} (${itemId}) oleh ${creatorLabel}`);

    const splitNote = creators.length > 1
      ? `<b>royalti 20% PSC dibagi rata (${creators.length} kreator)</b> otomatis!`
      : `<b>royalti 20% PSC</b> otomatis!`;

    for (const cr of creators) {
      await notifyPrivateUser(
        cr.id,
        `🎉 <b>ITEM COLLAB KAMU DI-ACC!</b>\n\nKarya <b>${escHtml(sub.name)}</b> resmi rilis di <b>Lapak Rongsok</b> seharga <b>${finalPrice} PSC</b>!\n` +
        `• Kamu otomatis dapat 1 item gratis di gudang.\n` +
        `• Tiap kali warga lain beli, kamu dapat ${splitNote}`,
        { buttonText: '🛍️ CEK LAPAK RONGSOK', startParam: 'lapak' }
      ).catch(() => {});
    }
  } else {
    db.prepare("UPDATE item_submissions SET status = 'rejected', reviewed_by = ? WHERE id = ?")
      .run(String(req.dbUser.id), id);
    logAudit(req.dbUser.id, 'TOLAK COLLAB', `${sub.name} oleh ${creatorLabel}`);

    for (const cr of creators) {
      await notifyPrivateUser(
        cr.id,
        `❌ <b>PENGAJUAN COLLAB DITOLAK</b>\nItem: <b>${escHtml(sub.name)}</b>\nAlasan: <i>Belum sesuai kriteria tema markas.</i>`
      ).catch(() => {});
    }
  }

  res.json({ ok: true, catalog: getCatalog() });
});

adminCatalogRouter.post('/admin/items', requireUser, uploadMem.single('asset'), async (req, res) => {
  if (!isAdminUser(req.dbUser)) return res.status(403).json({ error: 'Akses ditolak.' });

  try {
    const type = String(req.body?.type || 'gift').trim();
    const name = String(req.body?.name || '').trim().slice(0, 32);
    const price = Math.max(1, Number(req.body?.price) || 50);
    const rarity = String(req.body?.rarity || 'Rare').trim();
    const stock = req.body?.stock !== undefined && req.body?.stock !== '' ? Number(req.body.stock) : -1;
    const desc = String(req.body?.desc || '').trim().slice(0, 100);

    if (name.length < 2) return res.status(400).json({ error: 'Nama item wajib diisi.' });

    let imageUrl = '';
    if (req.file) {
      imageUrl = await processAndSaveImage(req.file, 'shop', { width: 512, height: 512, fit: 'inside' });
    }

    const id = 'itm_' + crypto.randomBytes(4).toString('hex');
    db.prepare(`
      INSERT INTO items (id, type, name, price, rarity, stock, desc, image_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, type, name, price, rarity, stock, desc, imageUrl, Date.now());

    logAudit(req.dbUser.id, 'TAMBAH ITEM', `${name} (${price} PSC)`);

    await broadcastToTelegram({
      target: 'both',
      text: `<b>ITEM BARU DI LAPAK RONGSOK</b>\n<b>${escHtml(name)}</b> (${escHtml(rarity)})\nHarga: <b>${price} PSC</b>\n<i>${escHtml(desc)}</i>`,
      buttonText: 'CEK LAPAK',
      startParam: 'lapak',
      feedText: `Item baru "${name}" rilis di Lapak Rongsok!`
    });

    res.json({ ok: true, catalog: getCatalog() });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Gagal menambah item.' });
  }
});

adminCatalogRouter.delete('/admin/items/:id', requireUser, (req, res) => {
  if (!isAdminUser(req.dbUser)) return res.status(403).json({ error: 'Akses ditolak.' });

  const itemId = String(req.params.id || '');
  const isForce = req.query?.force === '1' || req.query?.force === 'true' || Boolean(req.body?.force);
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
  if (!item) return res.status(404).json({ error: 'Item tidak ditemukan.' });

  if (isForce) {
    db.transaction(() => {
      db.prepare('DELETE FROM inventory WHERE item_id = ?').run(itemId);
      db.prepare("UPDATE users SET equipped_border_id = '' WHERE equipped_border_id = ?").run(itemId);
      db.prepare("UPDATE users SET equipped_skin_id = '' WHERE equipped_skin_id = ?").run(itemId);
      db.prepare("UPDATE users SET equipped_theme_id = '' WHERE equipped_theme_id = ?").run(itemId);
      db.prepare("UPDATE users SET pinned_gift_id = '' WHERE pinned_gift_id = ?").run(itemId);

      try {
        const pinnedUsers = db.prepare("SELECT id, pinned_gift_id FROM users WHERE pinned_gift_id LIKE ?").all(`%${itemId}%`);
        const updPin = db.prepare('UPDATE users SET pinned_gift_id = ? WHERE id = ?');
        for (const u of pinnedUsers) {
          const arr = JSON.parse(u.pinned_gift_id || '[]').filter((gid) => String(gid) !== itemId);
          updPin.run(arr.length ? JSON.stringify(arr) : '', u.id);
        }
      } catch (_) {}

      db.prepare('DELETE FROM items WHERE id = ?').run(itemId);
    })();

    logAudit(req.dbUser.id, 'HAPUS PERMANEN', `${item.name} (${itemId}) dihapus paksa dari sistem & gudang`);
    return res.json({
      ok: true,
      archived: false,
      forced: true,
      message: `Item "${item.name}" berhasil dihapus permanen dari katalog & gudang warga.`,
      catalog: getCatalog()
    });
  }

  const ownerRow = db.prepare('SELECT COUNT(*) AS cnt FROM inventory WHERE item_id = ?').get(itemId);
  const ownedCount = Number(ownerRow?.cnt || 0);
  const isCollabOrLimited = Boolean(
    item.is_collab ||
    item.is_limited ||
    String(item.rarity || '').toLowerCase().includes('collab') ||
    String(item.rarity || '').toLowerCase().includes('limited')
  );

  if (ownedCount > 0 || isCollabOrLimited) {
    let parsedCreators = null;
    if (item.creators_json) {
      try { parsedCreators = JSON.parse(item.creators_json); } catch (_) {}
    }

    const snapshot = JSON.stringify({
      id: item.id,
      type: item.type,
      name: item.name,
      price: item.price,
      rarity: String(item.rarity || '').toLowerCase().includes('collab') ? 'Collab · Limited' : 'Limited',
      colors: item.colors ? JSON.parse(item.colors) : ['#FFE666', '#D97706'],
      svgPath: item.svg_path || '',
      imageUrl: item.image_url || '',
      skinClass: item.skin_class || '',
      creatorName: item.creator_name || '',
      creators: parsedCreators,
      isLimited: true,
      isArchived: true
    });

    db.transaction(() => {
      db.prepare(`
        UPDATE items
        SET is_archived = 1,
            is_limited = 1,
            stock = 0,
            rarity = CASE
              WHEN LOWER(rarity) LIKE '%collab%' THEN 'Collab · Limited'
              ELSE 'Limited'
            END
        WHERE id = ?
      `).run(itemId);

      db.prepare("UPDATE inventory SET item_snapshot = ? WHERE item_id = ? AND (item_snapshot IS NULL OR item_snapshot = '')")
        .run(snapshot, itemId);
    })();

    logAudit(req.dbUser.id, 'ARSIP LIMITED', `${item.name} (${ownedCount} pemilik tetap menyimpan item)`);
    return res.json({
      ok: true,
      archived: true,
      message: `Item "${item.name}" ditarik dari Lapak & berubah menjadi LIMITED (${ownedCount} koleksi warga tetap aman).`,
      catalog: getCatalog()
    });
  }

  db.prepare('DELETE FROM items WHERE id = ?').run(itemId);
  logAudit(req.dbUser.id, 'HAPUS ITEM', `${item.name} (0 pemilik)`);
  res.json({ ok: true, archived: false, message: `Item "${item.name}" dihapus.`, catalog: getCatalog() });
});
