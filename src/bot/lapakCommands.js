import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { InlineKeyboard, InputFile } from 'grammy';
import { ENV } from '../config/env.js';
import { db } from '../database/db.js';
import { buildMiniAppUrl, escHtml, notifyPrivateUser } from '../services/syncEngine.js';
import { isBotOwnerOrAdmin } from './menus.js';

function logAudit(actorId, action, detail) {
  try {
    db.prepare('INSERT INTO audit_logs (actor_id, action, detail, created_at) VALUES (?, ?, ?, ?)')
      .run(String(actorId), action, detail, Date.now());
  } catch (e) {}
}

function resolveLocalUploadPath(imageUrl) {
  const clean = String(imageUrl || '').split('?')[0].trim();
  if (!clean || !clean.startsWith('/uploads/')) return '';
  const rel = clean.replace(/^\/uploads\//, '');
  const fullPath = path.join(ENV.UPLOAD_DIR, rel);
  return fs.existsSync(fullPath) ? fullPath : '';
}

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
            list.push({ id: cid, name: c.name || 'Warga', username: c.username || '' });
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

async function sendProtectedItemPreview(ctx, localFile, caption, kb) {
  const baseOpts = {
    caption,
    parse_mode: 'HTML',
    reply_markup: kb,
    protect_content: true // Anti-save, anti-download, anti-forward
  };

  if (localFile) {
    try {
      if (/\.webm$/i.test(localFile)) {
        await ctx.replyWithVideo(new InputFile(localFile), {
          ...baseOpts,
          supports_streaming: true
        });
        return;
      }
      if (/\.gif$/i.test(localFile)) {
        await ctx.replyWithAnimation(new InputFile(localFile), baseOpts);
        return;
      }
      await ctx.replyWithPhoto(new InputFile(localFile), baseOpts);
      return;
    } catch (_) {}
  }

  await ctx.reply(caption, {
    parse_mode: 'HTML',
    reply_markup: kb,
    protect_content: true
  });
}

export function registerLapakCommands(bot) {
  if (bot.__punkLapakCmdsBound) return;
  bot.__punkLapakCmdsBound = true;

  // Tampilkan / pamer item Lapak Rongsok (Collab/Resmi) atau Lapak Warga langsung di grup (Anti-Save)
  bot.command(['item', 'pamer'], async (ctx) => {
    const query = String(ctx.match || '').trim();
    if (!query) {
      return ctx.reply(
        '🛍️ <b>TAMPILKAN ITEM LAPAK KE GRUP</b>\n' +
        'Ketik: <code>/item nama_item</code>\n' +
        'Contoh: <code>/item Cyber Katana</code>',
        { parse_mode: 'HTML' }
      );
    }

    const likePattern = `%${query}%`;

    // 1. Cari di Lapak Rongsok (item resmi & item collab aktif)
    const rongsokItem = db.prepare(`
      SELECT * FROM items
      WHERE COALESCE(is_archived, 0) = 0
        AND LOWER(name) LIKE LOWER(?)
      ORDER BY (CASE WHEN LOWER(name) = LOWER(?) THEN 0 ELSE 1 END), created_at DESC
      LIMIT 1
    `).get(likePattern, query);

    if (rongsokItem) {
      let creatorText = '';
      if (rongsokItem.creators_json) {
        try {
          const arr = JSON.parse(rongsokItem.creators_json);
          if (Array.isArray(arr) && arr.length > 0) {
            creatorText = arr.map((c) => (c.username ? `@${c.username}` : c.name)).join(' × ');
          }
        } catch (_) {}
      }
      if (!creatorText && rongsokItem.creator_name) {
        creatorText = rongsokItem.creator_name;
      }

      const typeLabel = rongsokItem.type === 'theme' ? 'TEMA OS' : String(rongsokItem.type || 'ITEM').toUpperCase();
      const stockNum = rongsokItem.stock == null ? -1 : Number(rongsokItem.stock);
      const stockText = stockNum < 0 ? 'Unlimited' : (stockNum === 0 ? 'HABIS' : `${stockNum} pcs`);
      const isCollab = Boolean(Number(rongsokItem.is_collab)) || Boolean(creatorText);

      const caption =
        `${isCollab ? '🎨 <b>ITEM COLLAB — LAPAK RONGSOK</b>' : '🏪 <b>KATALOG RESMI — LAPAK RONGSOK</b>'}\n\n` +
        `• Nama: <b>${escHtml(rongsokItem.name)}</b>\n` +
        `• Kategori: <b>${escHtml(typeLabel)}</b> (${escHtml(rongsokItem.rarity || 'Rare')})\n` +
        `• Harga: <b>${rongsokItem.price} PSC</b> · Stok: <b>${stockText}</b>\n` +
        (creatorText ? `• Kreator: <b>${escHtml(creatorText)}</b>\n` : '') +
        (rongsokItem.desc ? `• Info: <i>${escHtml(rongsokItem.desc)}</i>\n` : '');

      const appUrl = buildMiniAppUrl('lapak');
      const kb = appUrl ? new InlineKeyboard().url('🛒 LIHAT & BELI DI LAPAK', appUrl) : undefined;
      const localFile = resolveLocalUploadPath(rongsokItem.image_url);

      await sendProtectedItemPreview(ctx, localFile, caption, kb);
      return;
    }

    // 2. Cari di Lapak Warga yang masih open
    const wargaItem = db.prepare(`
      SELECT * FROM warga_shop_items
      WHERE status = 'open'
        AND LOWER(title) LIKE LOWER(?)
      ORDER BY (CASE WHEN LOWER(title) = LOWER(?) THEN 0 ELSE 1 END), created_at DESC
      LIMIT 1
    `).get(likePattern, query);

    if (wargaItem) {
      const stockNum = wargaItem.stock == null ? 1 : Number(wargaItem.stock);
      const stockText = stockNum < 0 ? 'Unlimited' : `${stockNum} pcs`;
      const sellerLabel = wargaItem.seller_username
        ? `@${wargaItem.seller_username}`
        : (wargaItem.seller_name || 'Warga');

      const caption =
        `🛍️ <b>ETALASE LAPAK WARGA</b>\n\n` +
        `• Produk: <b>${escHtml(wargaItem.title)}</b>\n` +
        `• Kategori: <b>${escHtml(wargaItem.category || 'Barang')}</b>\n` +
        `• Harga: <b>${wargaItem.price} PSC</b> · Stok: <b>${stockText}</b>\n` +
        `• Pelapak: <b>${escHtml(sellerLabel)}</b>\n` +
        (wargaItem.description ? `• Detail: <i>${escHtml(wargaItem.description)}</i>\n` : '');

      const appUrl = buildMiniAppUrl('lapak');
      const kb = appUrl ? new InlineKeyboard().url('🛍️ INTIP LAPAK WARGA', appUrl) : undefined;
      const localFile = resolveLocalUploadPath(wargaItem.image_url);

      await sendProtectedItemPreview(ctx, localFile, caption, kb);
      return;
    }

    await ctx.reply(
      `🔍 Item dengan nama <b>"${escHtml(query)}"</b> belum ketemu di Lapak Rongsok maupun Lapak Warga.`,
      { parse_mode: 'HTML' }
    );
  });

  // Lihat antrean pengajuan item collab warga
  bot.command('list_collab', async (ctx) => {
    if (!isBotOwnerOrAdmin(ctx.from.id)) return ctx.reply('⛔ Khusus Owner & Admin.');
    const rows = db.prepare("SELECT * FROM item_submissions WHERE status = 'pending' ORDER BY created_at ASC LIMIT 15").all();
    if (!rows.length) return ctx.reply('✅ Belum ada antrean pengajuan Item Collab baru.');

    const lines = rows.map((r, i) =>
      `${i + 1}. <code>${r.id}</code> — <b>${escHtml(r.name)}</b> [${r.type.toUpperCase()}]\n` +
      `   Oleh: ${escHtml(r.creator_name)} · Ajuan: <b>${r.price} PSC</b>`
    ).join('\n\n');

    await ctx.reply(
      `🎨 <b>ANTREAN PENGAJUAN ITEM COLLAB</b>\n\n${lines}\n\n` +
      `<i>ACC:</i> <code>/acc_collab ID [harga_opsional]</code>\n` +
      `<i>Tolak:</i> <code>/tolak_collab ID [alasan]</code>`,
      { parse_mode: 'HTML' }
    );
  });

  // Setujui item collab -> otomatis masuk Lapak Rongsok & semua kreator (maks 3) dapat royalti 20% dibagi rata
  bot.command('acc_collab', async (ctx) => {
    if (!isBotOwnerOrAdmin(ctx.from.id)) return ctx.reply('⛔ Khusus Owner & Admin.');
    const args = String(ctx.match || '').trim().split(/\s+/).filter(Boolean);
    const subId = args[0];
    if (!subId) return ctx.reply('Format: <code>/acc_collab col_xxxxxx [harga_baru]</code>', { parse_mode: 'HTML' });

    const sub = db.prepare('SELECT * FROM item_submissions WHERE id = ?').get(subId);
    if (!sub) return ctx.reply('ID pengajuan collab tidak ditemukan.');
    if (sub.status !== 'pending') return ctx.reply(`Pengajuan ini sudah berstatus: ${sub.status.toUpperCase()}`);

    const creators = extractSubmissionCreators(sub);
    const creatorLabel = creators.length > 1
      ? creators.map((c) => (c.username ? `@${c.username}` : c.name)).join(' × ')
      : (sub.creator_username ? `@${sub.creator_username}` : sub.creator_name);

    const finalPrice = args[1] && Number(args[1]) >= 20 ? Number(args[1]) : sub.price;
    const itemId = 'collab-' + crypto.randomBytes(3).toString('hex');
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
        sub.image_url,
        primaryCreatorId,
        creatorLabel,
        JSON.stringify(creators),
        now
      );

      db.prepare("UPDATE item_submissions SET status = 'approved', reviewed_by = ? WHERE id = ?")
        .run(String(ctx.from.id), subId);

      const insInv = db.prepare('INSERT INTO inventory (user_id, item_id, acquired_at) VALUES (?, ?, ?)');
      creators.forEach((cr, idx) => {
        insInv.run(cr.id, itemId, now + idx);
      });
    })();

    logAudit(ctx.from.id, 'ACC COLLAB', `Setujui ${sub.name} (${itemId}) oleh ${creatorLabel}`);

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
      );
    }

    await ctx.reply(
      `✅ <b>COLLAB RILIS KE LAPAK RONGSOK!</b>\n• Item: <b>${escHtml(sub.name)}</b> (${sub.type.toUpperCase()})\n• Kreator: ${escHtml(creatorLabel)} (Royalti 20%)\n• Harga: <b>${finalPrice} PSC</b>`,
      { parse_mode: 'HTML' }
    );
  });

  // Tolak item collab
  bot.command('tolak_collab', async (ctx) => {
    if (!isBotOwnerOrAdmin(ctx.from.id)) return ctx.reply('⛔ Khusus Owner & Admin.');
    const args = String(ctx.match || '').trim().split(/\s+/).filter(Boolean);
    const subId = args[0];
    if (!subId) return ctx.reply('Format: <code>/tolak_collab col_xxxxxx alasan</code>', { parse_mode: 'HTML' });

    const sub = db.prepare('SELECT * FROM item_submissions WHERE id = ?').get(subId);
    if (!sub || sub.status !== 'pending') return ctx.reply('Pengajuan tidak ditemukan atau sudah diproses.');

    const creators = extractSubmissionCreators(sub);
    const reason = args.slice(1).join(' ') || 'Belum sesuai kriteria tema markas.';
    db.prepare("UPDATE item_submissions SET status = 'rejected', reviewed_by = ? WHERE id = ?").run(String(ctx.from.id), subId);

    for (const cr of creators) {
      await notifyPrivateUser(
        cr.id,
        `❌ <b>PENGAJUAN COLLAB DITOLAK</b>\nItem: <b>${escHtml(sub.name)}</b>\nAlasan: <i>${escHtml(reason)}</i>`
      );
    }
    await ctx.reply(`🗑️ Pengajuan <b>${escHtml(sub.name)}</b> ditolak.`, { parse_mode: 'HTML' });
  });

  // Restock produk lapak warga via bot
  bot.command('restock', async (ctx) => {
    if (!isBotOwnerOrAdmin(ctx.from.id)) return ctx.reply('⛔ Khusus Owner & Admin.');
    const args = String(ctx.match || '').trim().split(/\s+/).filter(Boolean);
    const itemId = args[0];
    const stock = parseInt(args[1], 10);
    if (!itemId || Number.isNaN(stock)) {
      return ctx.reply('Format: <code>/restock ws_xxxxxx 10</code>', { parse_mode: 'HTML' });
    }
    const status = stock === 0 ? 'sold' : 'open';
    const info = db.prepare('UPDATE warga_shop_items SET stock = ?, status = ? WHERE id = ?').run(stock, status, itemId);
    await ctx.reply(info.changes ? `✅ Stok <code>${escHtml(itemId)}</code> di-update menjadi <b>${stock}</b>.` : 'ID produk tidak ketemu.', { parse_mode: 'HTML' });
  });

  // Hapus produk lapak warga via bot
  bot.command('hapus_lapak', async (ctx) => {
    if (!isBotOwnerOrAdmin(ctx.from.id)) return ctx.reply('⛔ Khusus Owner & Admin.');
    const itemId = String(ctx.match || '').trim();
    if (!itemId) return ctx.reply('Format: <code>/hapus_lapak ws_xxxxxx</code>', { parse_mode: 'HTML' });
    const info = db.prepare("UPDATE warga_shop_items SET status = 'deleted' WHERE id = ?").run(itemId);
    await ctx.reply(info.changes ? `🗑️ Produk <code>${escHtml(itemId)}</code> dihapus dari etalase.` : 'ID produk tidak ketemu.', { parse_mode: 'HTML' });
  });
}
