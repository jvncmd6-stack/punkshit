import crypto from 'crypto';
import { db } from '../database/db.js';
import { escHtml, notifyPrivateUser } from '../services/syncEngine.js';
import { isBotOwnerOrAdmin } from './menus.js';

function logAudit(actorId, action, detail) {
  try {
    db.prepare('INSERT INTO audit_logs (actor_id, action, detail, created_at) VALUES (?, ?, ?, ?)')
      .run(String(actorId), action, detail, Date.now());
  } catch (e) {}
}

export function registerLapakCommands(bot) {
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

  // Setujui item collab -> otomatis masuk Lapak Rongsok & kreator dapat royalti 20%
  bot.command('acc_collab', async (ctx) => {
    if (!isBotOwnerOrAdmin(ctx.from.id)) return ctx.reply('⛔ Khusus Owner & Admin.');
    const args = String(ctx.match || '').trim().split(/\s+/).filter(Boolean);
    const subId = args[0];
    if (!subId) return ctx.reply('Format: <code>/acc_collab col_xxxxxx [harga_baru]</code>', { parse_mode: 'HTML' });

    const sub = db.prepare('SELECT * FROM item_submissions WHERE id = ?').get(subId);
    if (!sub) return ctx.reply('ID pengajuan collab tidak ditemukan.');
    if (sub.status !== 'pending') return ctx.reply(`Pengajuan ini sudah berstatus: ${sub.status.toUpperCase()}`);

    const finalPrice = args[1] && Number(args[1]) >= 20 ? Number(args[1]) : sub.price;
    const itemId = 'collab-' + crypto.randomBytes(3).toString('hex');
    const creatorLabel = sub.creator_username ? `@${sub.creator_username}` : sub.creator_name;
    const fullDesc = `${sub.desc || 'Item spesial kolaborasi warga.'} (Collab by ${creatorLabel})`;

    db.transaction(() => {
      db.prepare(`
        INSERT INTO items (id, type, name, price, rarity, stock, desc, image_url, creator_id, creator_name, is_collab, created_at)
        VALUES (?, ?, ?, ?, 'Collab', -1, ?, ?, ?, ?, 1, ?)
      `).run(itemId, sub.type, sub.name, finalPrice, fullDesc, sub.image_url, sub.creator_id, creatorLabel, Date.now());

      db.prepare("UPDATE item_submissions SET status = 'approved', reviewed_by = ? WHERE id = ?").run(String(ctx.from.id), subId);
      db.prepare('INSERT INTO inventory (user_id, item_id, acquired_at) VALUES (?, ?, ?)').run(sub.creator_id, itemId, Date.now());
    })();

    logAudit(ctx.from.id, 'ACC COLLAB', `Setujui ${sub.name} (${itemId}) oleh ${creatorLabel}`);
    await notifyPrivateUser(
      sub.creator_id,
      `🎉 <b>ITEM COLLAB KAMU DI-ACC!</b>\n\nKarya <b>${escHtml(sub.name)}</b> resmi rilis di <b>Lapak Rongsok</b> seharga <b>${finalPrice} PSC</b>!\n` +
      `• Kamu otomatis dapat 1 item gratis di gudang.\n` +
      `• Tiap kali warga lain beli, kamu dapat <b>royalti 20% PSC</b> otomatis!`,
      { buttonText: '🛍️ CEK LAPAK RONGSOK', startParam: 'lapak' }
    );

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

    const reason = args.slice(1).join(' ') || 'Belum sesuai kriteria tema markas.';
    db.prepare("UPDATE item_submissions SET status = 'rejected', reviewed_by = ? WHERE id = ?").run(String(ctx.from.id), subId);

    await notifyPrivateUser(
      sub.creator_id,
      `❌ <b>PENGAJUAN COLLAB DITOLAK</b>\nItem: <b>${escHtml(sub.name)}</b>\nAlasan: <i>${escHtml(reason)}</i>`
    );
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
