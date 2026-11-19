import { Router } from 'express';
import { db } from '../database/db.js';
import { requireUser } from '../middlewares/authTma.js';
import { formatUser, broadcastToTelegram, escHtml, todayWib } from '../services/syncEngine.js';

export const gameRouter = Router();

// POST /api/game/play -> Mancing Galatama, Gosok Nasib, & Mesin Rongsok
gameRouter.post('/game/play', requireUser, async (req, res) => {
  const u = req.dbUser;
  const game = String(req.body?.game || '');
  const today = todayWib();
  const now = Date.now();

  // 1. MANCING GALATAMA (Maks 6x per hari)
  if (game === 'fish') {
    const used = (u.fish_date === today) ? u.fish_today : 0;
    if (used >= 6) {
      return res.status(400).json({ error: 'Jatah mancing hari ini (6/6) udah habis bro. Besok lagi!' });
    }

    const roll = Math.random();
    let resultText = '';
    let pscBonus = 0;
    let itemId = null;

    if (roll < 0.04) {
      // 4% Legendary Golden Punkfish!
      itemId = 'fish';
      pscBonus = 25;
      resultText = '🏆 NO WAY! GOLDEN PUNKFISH CAUGHT! (+25 PSC & masuk Gudang Barang)';
    } else if (roll < 0.22) {
      pscBonus = 10;
      resultText = '✨ Dapat Lele Chrome langka! Ditukar langsung jadi +10 PSC.';
    } else if (roll < 0.65) {
      pscBonus = 4;
      resultText = '🐟 Dapat Lele Punkshit ukuran sedang (+4 PSC).';
    } else {
      pscBonus = 1;
      resultText = '🩴 CONGRATULATIONS... I GUESS? Kail lu nyangkut sandal hanyut (+1 PSC kasihan).';
    }

    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE users SET fish_today = ?, fish_date = ?, fish_count = fish_count + 1, psc = psc + ?, cred = cred + 1
        WHERE id = ?
      `).run(used + 1, today, pscBonus, u.id);

      if (itemId) {
        db.prepare('INSERT INTO inventory (user_id, item_id, acquired_at) VALUES (?, ?, ?)').run(u.id, itemId, now);
      }
      db.prepare('INSERT INTO transactions (user_id, type, amount, note, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(u.id, 'game_fish', pscBonus, 'Hasil Mancing Galatama', now);
    });
    tx();

    if (itemId === 'fish') {
      await broadcastToTelegram({
        target: 'group',
        text: `🏆 <b>MAIN CHARACTER LUCK!</b>\n<b>${escHtml(u.name)}</b> baru saja memancing <b>Golden Punkfish (Legendary)</b> di Mancing Galatama!`,
        buttonText: '🎣 IKUT MANCING',
        startParam: 'arena',
        feedText: `${u.name} dapat Golden Punkfish di Mancing Galatama!`
      });
    }

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(u.id);
    const inv = db.prepare('SELECT id, item_id AS itemId, acquired_at AS acquiredAt FROM inventory WHERE user_id = ? ORDER BY id DESC').all(u.id);
    return res.json({ user: formatUser(updated), inv, resultText });
  }

  // 2. GOSOK NASIB (1x gratis per hari)
  if (game === 'scratch') {
    if (u.scratched_date === today) {
      return res.status(400).json({ error: 'Kartu Gosok Nasib hari ini sudah dipakai.' });
    }
    const prizes = [3, 5, 8, 12, 20];
    const won = prizes[Math.floor(Math.random() * prizes.length)];

    const tx = db.transaction(() => {
      db.prepare('UPDATE users SET scratched_date = ?, psc = psc + ?, cred = cred + 1 WHERE id = ?').run(today, won, u.id);
      db.prepare('INSERT INTO transactions (user_id, type, amount, note, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(u.id, 'game_scratch', won, 'Hadiah Gosok Nasib', now);
    });
    tx();

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(u.id);
    return res.json({ user: formatUser(updated), resultText: `🎟️ JACKPOT KECIL! Kartu gosok berhadiah +${won} PSC!` });
  }

  // 3. MESIN RONGSOK (Capit)
  if (game === 'claw') {
    const success = Math.random() < 0.35;
    if (!success) {
      return res.json({ resultText: '🕹️ SO CLOSE! Capitnya udah pegang terus meleset. Emotional damage.' });
    }
    const won = 6;
    const tx = db.transaction(() => {
      db.prepare('UPDATE users SET psc = psc + ?, cred = cred + 1 WHERE id = ?').run(won, u.id);
      db.prepare('INSERT INTO transactions (user_id, type, amount, note, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(u.id, 'game_claw', won, 'Hadiah Mesin Rongsok', now);
    });
    tx();

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(u.id);
    return res.json({ user: formatUser(updated), resultText: `🕹️ DAPET! Capit berhasil ngangkat kapsul berisi +${won} PSC!` });
  }

  res.status(400).json({ error: 'Jenis game tidak dikenali.' });
});

// POST /api/game/score -> Reaction Rush & Punk Trivia
gameRouter.post('/game/score', requireUser, (req, res) => {
  const u = req.dbUser;
  const game = String(req.body?.game || '');
  const score = Number(req.body?.score) || 0;
  const now = Date.now();

  if (game === 'react') {
    if (score < 90 || score > 5000) {
      return res.status(400).json({ error: 'Skor refleks tidak valid.' });
    }
    if (score <= 320) {
      db.prepare('UPDATE users SET psc = psc + 3, cred = cred + 1 WHERE id = ?').run(u.id);
      db.prepare('INSERT INTO transactions (user_id, type, amount, note, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(u.id, 'game_react', 3, `Reaction Rush (${score}ms)`, now);
      const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(u.id);
      return res.json({ user: formatUser(updated), resultText: `⚡ KILAT! ${score}ms — Refleks dewa (+3 PSC)!` });
    }
    return res.json({ resultText: `⏱️ ${score}ms — Lumayan, kejar di bawah 320ms buat dapet bonus PSC!` });
  }

  if (game === 'trivia') {
    db.prepare('UPDATE users SET psc = psc + 5, cred = cred + 2 WHERE id = ?').run(u.id);
    db.prepare('INSERT INTO transactions (user_id, type, amount, note, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(u.id, 'game_trivia', 5, 'Menjawab benar Punk Trivia', now);
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(u.id);
    return res.json({ user: formatUser(updated), resultText: '🧠 TEPAT! +5 PSC & +2 Street Cred masuk akun!' });
  }

  res.status(400).json({ error: 'Game skor tidak valid.' });
});
