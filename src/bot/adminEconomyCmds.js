import { InlineKeyboard } from 'grammy';
import crypto from 'crypto';
import { ENV } from '../config/env.js';
import { db } from '../database/db.js';
import { escHtml } from '../services/syncEngine.js';
import {
  isBotAdmin,
  isBotOwnerOrAdmin,
  setSetting,
  renderGreetInfoText
} from './menus.js';

export function isStrictOwner(userId) {
  const owners = (ENV.OWNER_IDS || []).map(String);
  return Boolean(userId && owners.includes(String(userId)));
}

export function logAudit(actorId, action, detail) {
  try {
    db.prepare('INSERT INTO audit_logs (actor_id, action, detail, created_at) VALUES (?, ?, ?, ?)')
      .run(String(actorId), action, detail, Date.now());
  } catch (e) {}
}

function purgeWargaData(userId, username = '') {
  const uid = String(userId);
  const usn = String(username || '').replace(/^@/, '').toLowerCase();

  const existing = db.prepare('SELECT id, name, username FROM users WHERE id = ?').get(uid);
  const targetUsn = usn || (existing?.username || '').toLowerCase();

  db.prepare('DELETE FROM users WHERE id = ?').run(uid);

  if (targetUsn) {
    try { db.prepare('DELETE FROM spark_pairs WHERE user1 = ? OR user2 = ?').run(targetUsn, targetUsn); } catch (e) {}
    try { db.prepare('DELETE FROM spark_daily WHERE username = ?').run(targetUsn); } catch (e) {}
  }

  try { db.prepare('DELETE FROM inventory WHERE user_id = ?').run(uid); } catch (e) {}
  try { db.prepare('DELETE FROM warga_shop_items WHERE seller_id = ?').run(uid); } catch (e) {}
  try { db.prepare('DELETE FROM member_market WHERE seller_id = ?').run(uid); } catch (e) {}

  return existing;
}

export function registerAdminEconomyCommands(bot) {
  // 1. Freeze / Unfreeze Akun Warga
  bot.command(['freeze', 'unfreeze'], async (ctx) => {
    if (!isBotOwnerOrAdmin(ctx.from.id)) return ctx.reply('⛔ Khusus Owner & Admin.');
    const isFreeze = ctx.message.text.startsWith('/freeze');
    const args = String(ctx.match || '').trim().split(/\s+/).filter(Boolean);
    const replyUser = ctx.message?.reply_to_message?.from;
    let targetUser = null;
    let reason = 'Penertiban Markas';

    if (replyUser && !replyUser.is_bot) {
      targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(String(replyUser.id));
      if (args.length) reason = args.join(' ');
    } else if (args.length >= 1) {
      const raw = args[0].replace(/^@/, '');
      targetUser = db.prepare('SELECT * FROM users WHERE id = ? OR LOWER(username) = LOWER(?)').get(raw, raw);
      if (args.length > 1) reason = args.slice(1).join(' ');
    } else {
      return ctx.reply('Format: <code>/freeze @username alasan</code> atau reply pesan warga.', { parse_mode: 'HTML' });
    }

    if (!targetUser) return ctx.reply('Warga tidak ditemukan di database PunkID.');
    if (isStrictOwner(targetUser.id)) return ctx.reply('⛔ Akun Owner tidak dapat dibekukan.');

    db.prepare('UPDATE users SET is_frozen = ? WHERE id = ?').run(isFreeze ? 1 : 0, targetUser.id);
    logAudit(ctx.from.id, isFreeze ? 'FREEZE (BOT)' : 'UNFREEZE (BOT)', `${targetUser.name} (${reason})`);

    await ctx.reply(
      isFreeze
        ? `🧊 <b>AKUN DIBEKUKAN SEMENTARA</b>\nWarga: <b>${escHtml(targetUser.name)}</b>\nAlasan: <i>${escHtml(reason)}</i>`
        : `✅ <b>AKUN DIPULIHKAN</b>\nWarga <b>${escHtml(targetUser.name)}</b> sudah bisa beraktivitas kembali.`,
      { parse_mode: 'HTML' }
    );
  });

  // 2. Hapus Permanen PunkID Warga (Khusus Owner)
  bot.command('delwarga', async (ctx) => {
    if (!isStrictOwner(ctx.from.id)) return ctx.reply('⛔ Penghapusan permanen data warga khusus Owner.');
    const rawTarget = String(ctx.match || '').trim().replace(/^@/, '');
    const replyUser = ctx.message?.reply_to_message?.from;
    let targetUser = null;

    if (rawTarget) {
      targetUser = db.prepare('SELECT * FROM users WHERE id = ? OR LOWER(username) = LOWER(?)').get(rawTarget, rawTarget);
    } else if (replyUser && !replyUser.is_bot) {
      targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(String(replyUser.id));
    } else {
      return ctx.reply('Format: <code>/delwarga @username</code> atau <code>/delwarga 123456789</code>', { parse_mode: 'HTML' });
    }

    if (!targetUser) return ctx.reply('Data PunkID warga tersebut sudah tidak ada di database.');
    purgeWargaData(targetUser.id, targetUser.username);
    logAudit(ctx.from.id, 'DEL WARGA (BOT)', `Hapus PunkID ${targetUser.name} (${targetUser.id})`);
    await ctx.reply(`🗑️ <b>PUNKID DIHAPUS</b>\nData warga <b>${escHtml(targetUser.name)}</b> resmi dihapus.`, { parse_mode: 'HTML' });
  });

  // 3. Give PSC (Owner langsung cair, Admin wajib izin Owner)
  bot.command('givepsc', async (ctx) => {
    if (!isBotOwnerOrAdmin(ctx.from.id)) return ctx.reply('⛔ Khusus Owner & Admin.');
    const args = String(ctx.match || '').trim().split(/\s+/).filter(Boolean);
    const replyUser = ctx.message?.reply_to_message?.from;
    let targetUser = null;
    let amount = 0;
    let reason = 'Hadiah / Apresiasi Event';

    if (replyUser && !replyUser.is_bot && args.length >= 1 && /^-?\d+$/.test(args[0])) {
      amount = Number(args[0]);
      if (args.length > 1) reason = args.slice(1).join(' ');
      targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(String(replyUser.id));
    } else if (args.length >= 2) {
      const rawTarget = args[0].replace(/^@/, '');
      amount = Number(args[1]);
      if (args.length > 2) reason = args.slice(2).join(' ');
      targetUser = db.prepare('SELECT * FROM users WHERE id = ? OR LOWER(username) = LOWER(?)').get(rawTarget, rawTarget);
    } else {
      return ctx.reply('Format: <code>/givepsc @username 500 alasan</code> atau reply pesan warga lalu <code>/givepsc 500</code>', { parse_mode: 'HTML' });
    }

    if (!amount || Number.isNaN(amount)) return ctx.reply('Nominal koin PSC harus berupa angka valid.');
    if (!targetUser) return ctx.reply('Warga belum terdaftar di database PunkID.');

    if (isStrictOwner(ctx.from.id)) {
      db.prepare('UPDATE users SET psc = MAX(0, psc + ?) WHERE id = ?').run(amount, targetUser.id);
      const updated = db.prepare('SELECT psc FROM users WHERE id = ?').get(targetUser.id);
      logAudit(ctx.from.id, 'OWNER PSC (BOT)', `${amount > 0 ? '+' : ''}${amount} PSC ke ${targetUser.name} (${reason})`);

      const sign = amount > 0 ? `+${amount}` : `${amount}`;
      return ctx.reply(
        `💰 <b>TRANSAKSI PSC BERHASIL (OWNER)</b>\n• Penerima: <b>${escHtml(targetUser.name)}</b>\n• Nominal: <b>${sign} PSC</b>\n• Saldo Sekarang: <b>${updated.psc} PSC</b>\n• Keterangan: <i>${escHtml(reason)}</i>`,
        { parse_mode: 'HTML' }
      );
    }

    if (amount < 1 || amount > 5000) {
      return ctx.reply('Admin hanya bisa mengajukan pencairan positif antara 1 s/d 5.000 PSC untuk disetujui Owner.');
    }

    const reqId = 'req_' + crypto.randomBytes(4).toString('hex');
    const requesterName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || 'Admin';
    db.prepare(`
      INSERT INTO psc_requests (id, requester_id, requester_name, target_id, target_name, amount, reason, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(reqId, String(ctx.from.id), requesterName, String(targetUser.id), targetUser.name, amount, reason, Date.now());

    logAudit(ctx.from.id, 'AJUKAN PSC (BOT)', `${requesterName} mengajukan ${amount} PSC ke ${targetUser.name}`);

    const kb = new InlineKeyboard()
      .text('✅ Izinkan & Cairkan', `psc_acc:${reqId}`)
      .text('❌ Tolak', `psc_rej:${reqId}`);

    for (const ownerId of (ENV.OWNER_IDS || [])) {
      await bot.api.sendMessage(
        ownerId,
        `🔐 <b>PERMINTAAN IZIN PENCAIRAN PSC</b>\n\n• Admin Pengaju: <b>${escHtml(requesterName)}</b>\n• Penerima: <b>${escHtml(targetUser.name)}</b>\n• Nominal: <b>+${amount} PSC</b>\n• Alasan: <i>${escHtml(reason)}</i>\n\nKetuk tombol di bawah untuk memberi izin:`,
        { parse_mode: 'HTML', reply_markup: kb }
      ).catch(() => {});
    }

    return ctx.reply(
      `⏳ <b>MENUNGGU IZIN OWNER</b>\nPengajuan <b>+${amount} PSC</b> untuk <b>${escHtml(targetUser.name)}</b> sudah dikirim ke Owner Markas untuk disetujui.`,
      { parse_mode: 'HTML' }
    );
  });

  // 4. Atur Jabatan Pengurus (Khusus Owner)
  bot.command('setrole', async (ctx) => {
    const senderId = String(ctx.from.id);
    if (!isStrictOwner(senderId)) return ctx.reply('⛔ Khusus Owner utama.');
    const args = String(ctx.match || '').trim().split(/\s+/).filter(Boolean);
    if (args.length < 2) return ctx.reply('Format: <code>/setrole @username admin</code>', { parse_mode: 'HTML' });

    const rawTarget = args[0].replace(/^@/, '');
    const role = args[1].toLowerCase();
    if (!['admin', 'moderator', 'member'].includes(role)) return ctx.reply('Role cuma boleh: admin, moderator, atau member.');

    const targetUser = db.prepare('SELECT * FROM users WHERE id = ? OR LOWER(username) = LOWER(?)').get(rawTarget, rawTarget);
    if (!targetUser) return ctx.reply('Warga tidak ketemu di database PunkID.');

    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, targetUser.id);
    logAudit(senderId, 'SET ROLE (BOT)', `${targetUser.name} -> ${role}`);
    await ctx.reply(`✅ Role <b>${escHtml(targetUser.name)}</b> diubah menjadi <b>${role.toUpperCase()}</b>.`, { parse_mode: 'HTML' });
  });

  // 5. Pengaturan Teks & Media Sambutan (Greet, Bye, Pasal, Help) di PC Bot
  bot.command('setpasal', async (ctx) => {
    if (ctx.chat.type !== 'private' || !isBotAdmin(ctx.from.id)) return;
    const text = String(ctx.match || '').trim();
    if (text.length < 5) return ctx.reply('Format: /setpasal teks baru...');
    setSetting('pasal_text', text);
    await ctx.reply('✅ Teks Pasal berhasil di-update.');
  });

  bot.command('sethelp', async (ctx) => {
    if (ctx.chat.type !== 'private' || !isBotAdmin(ctx.from.id)) return;
    const text = String(ctx.match || '').trim();
    if (text.length < 5) return ctx.reply('Format: /sethelp teks baru...');
    setSetting('help_text', text);
    await ctx.reply('✅ Teks Help berhasil di-update.');
  });

  bot.command('greetinfo', async (ctx) => {
    if (ctx.chat.type !== 'private' || !isBotAdmin(ctx.from.id)) return;
    const kb = new InlineKeyboard().text('⚙️ Command Admin', 'pc_admin_cmd').row().text('« Menu Utama', 'pc_home');
    await ctx.reply(renderGreetInfoText(), { parse_mode: 'HTML', reply_markup: kb });
  });

  bot.command('setgreet', async (ctx) => {
    if (ctx.chat.type !== 'private' || !isBotAdmin(ctx.from.id)) return;
    const text = String(ctx.match || '').trim();
    if (text.length < 3) return ctx.reply('Format: /setgreet Selamat datang {mention}...');
    setSetting('greet_text', text);
    await ctx.reply('✅ Teks Greet berhasil diganti.');
  });

  bot.command('setbye', async (ctx) => {
    if (ctx.chat.type !== 'private' || !isBotAdmin(ctx.from.id)) return;
    const text = String(ctx.match || '').trim();
    if (text.length < 3) return ctx.reply('Format: /setbye Yah {name} cabut...');
    setSetting('bye_text', text);
    await ctx.reply('✅ Teks Bye berhasil diganti.');
  });

  bot.command('setgreetmedia', async (ctx) => {
    if (ctx.chat.type !== 'private' || !isBotAdmin(ctx.from.id)) return;
    const reply = ctx.message?.reply_to_message;
    if (!reply) return ctx.reply('Reply GIF atau Stiker dengan /setgreetmedia.');
    if (reply.animation) { setSetting('greet_media', `animation:${reply.animation.file_id}`); return ctx.reply('✅ GIF Greet dipasang.'); }
    if (reply.sticker) { setSetting('greet_media', `sticker:${reply.sticker.file_id}`); return ctx.reply('✅ Stiker Greet dipasang.'); }
    await ctx.reply('Cuma bisa reply GIF atau Stiker.');
  });

  bot.command('setbyemedia', async (ctx) => {
    if (ctx.chat.type !== 'private' || !isBotAdmin(ctx.from.id)) return;
    const reply = ctx.message?.reply_to_message;
    if (!reply) return ctx.reply('Reply GIF atau Stiker dengan /setbyemedia.');
    if (reply.animation) { setSetting('bye_media', `animation:${reply.animation.file_id}`); return ctx.reply('✅ GIF Bye dipasang.'); }
    if (reply.sticker) { setSetting('bye_media', `sticker:${reply.sticker.file_id}`); return ctx.reply('✅ Stiker Bye dipasang.'); }
    await ctx.reply('Cuma bisa reply GIF atau Stiker.');
  });

  bot.command('delgreetmedia', async (ctx) => {
    if (ctx.chat.type !== 'private' || !isBotAdmin(ctx.from.id)) return;
    setSetting('greet_media', '');
    await ctx.reply('✅ Media Greet dicopot.');
  });

  bot.command('delbyemedia', async (ctx) => {
    if (ctx.chat.type !== 'private' || !isBotAdmin(ctx.from.id)) return;
    setSetting('bye_media', '');
    await ctx.reply('✅ Media Bye dicopot.');
  });
}
