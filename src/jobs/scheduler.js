import cron from 'node-cron';
import { db } from '../database/db.js';
import { broadcastToTelegram, escHtml, todayWib } from '../services/syncEngine.js';

export function startScheduler(bot) {
  // 1. Setiap pukul 08.00 WIB -> Cek Birthday Club
  cron.schedule('0 8 * * *', async () => {
    const nowWib = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const dd = String(nowWib.getDate()).padStart(2, '0');
    const mm = String(nowWib.getMonth() + 1).padStart(2, '0');
    const todayDdMm = `${dd}-${mm}`;

    const bdayUsers = db.prepare('SELECT * FROM users WHERE birthday = ?').all(todayDdMm);
    for (const u of bdayUsers) {
      db.prepare('UPDATE users SET psc = psc + 50 WHERE id = ?').run(u.id);
      db.prepare('INSERT INTO transactions (user_id, type, amount, note, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(u.id, 'birthday', 50, 'Kado Ulang Tahun dari Markas', Date.now());

      await broadcastToTelegram({
        target: 'both',
        text:
          `🎂 <b>LEVEL UP: AGE EDITION!</b>\n` +
          `Happy Birthday, <b>${escHtml(u.name)}</b>! 🎉\n\n` +
          `Selamat bertambah umur dan berhasil survive satu season lagi. <b>+50 PSC</b> udah ditransfer ke dompet lo!`,
        buttonText: '🎂 UCAPIN DI MARKAS',
        feedText: `🎂 Happy Birthday ${u.name}! (+50 PSC kado markas).`
      });
    }
  }, { timezone: 'Asia/Jakarta' });

  // 2. Setiap pukul 09.00 WIB -> Buka Time Capsule yang sudah jatuh tempo
  cron.schedule('0 9 * * *', async () => {
    const today = todayWib();
    const dueCapsules = db.prepare('SELECT * FROM capsules WHERE opened = 0 AND unlock_date <= ?').all(today);

    for (const cap of dueCapsules) {
      db.prepare('UPDATE capsules SET opened = 1 WHERE id = ?').run(cap.id);
      if (bot) {
        try {
          await bot.api.sendMessage(
            cap.user_id,
            `📦 <b>TIME CAPSULE UNLOCKED!</b>\n` +
            `Ada pesan dari diri lo di masa lalu yang dikunci buat dibuka hari ini:\n\n` +
            `<i>"${escHtml(cap.message)}"</i>`,
            { parse_mode: 'HTML' }
          );
        } catch {}
      }
    }
  }, { timezone: 'Asia/Jakarta' });

  // 3. Setiap hari Minggu pukul 20.00 WIB -> Publikasi Rekap Mingguan ke Channel
  cron.schedule('0 20 * * 0', async () => {
    const top = db.prepare('SELECT name, streak, cred, psc FROM users ORDER BY streak DESC, cred DESC LIMIT 3').all();
    if (!top.length) return;

    const medals = ['🥇', '🥈', '🥉'];
    const board = top.map((u, i) => `${medals[i]} <b>${escHtml(u.name)}</b> — ${u.streak} hari streak (${u.psc} PSC)`).join('\n');

    await broadcastToTelegram({
      target: 'channel',
      text:
        `📰 <b>WEEKLY RECAP — HALL OF FAME PUNKSHIT</b>\n\n` +
        `Daftar warga paling rajin menjaga nyawa minggu ini:\n\n${board}\n\n` +
        `<i>Stay weird. Stay connected. Stay Punkshit.</i>`,
      buttonText: '🏆 LIHAT KLASEMEN LENGKAP',
      startParam: 'fame'
    });
  }, { timezone: 'Asia/Jakarta' });
}
