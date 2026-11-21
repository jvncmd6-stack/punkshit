import { Router } from 'express';
import { db } from '../database/db.js';
import { requireUser } from '../middlewares/authTma.js';
import { formatUser, broadcastToTelegram, escHtml } from '../services/syncEngine.js';

export const kotakBirthdayRouter = Router();

db.exec(`
  CREATE TABLE IF NOT EXISTS menfess_replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    menfess_id TEXT NOT NULL,
    reply_text TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS birthday_claims (
    user_id TEXT NOT NULL,
    year_key TEXT NOT NULL,
    claimed_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, year_key)
  );
`);

function todayWibParts() {
  const now = new Date(Date.now() + 7 * 3600 * 1000);
  const iso = now.toISOString().slice(0, 10); // YYYY-MM-DD
  return {
    year: iso.slice(0, 4),
    mmdd: iso.slice(5, 10) // MM-DD
  };
}

// 1. GET /api/menfess/archive -> Ambil Menfess yang sudah disetujui beserta balasan anonimnya
kotakBirthdayRouter.get('/menfess/archive', (req, res) => {
  try {
    let approved = [];
    try {
      approved = db.prepare(`
        SELECT id, category, text, created_at
        FROM menfess
        WHERE status = 'approved'
        ORDER BY created_at DESC
        LIMIT 15
      `).all();
    } catch (_) {}

    const repliesStmt = db.prepare(`
      SELECT id, menfess_id, reply_text, created_at
      FROM menfess_replies
      WHERE menfess_id = ?
      ORDER BY id ASC
      LIMIT 10
    `);

    const items = approved.map((m) => ({
      id: m.id,
      category: m.category || 'Confession',
      text: m.text || '',
      createdAt: m.created_at || 0,
      replies: repliesStmt.all(String(m.id))
    }));

    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat arsip Kotak Rahasia: ' + err.message });
  }
});

// 2. POST /api/menfess/reply -> Kirim balasan anonim pendek ke Menfess yang sudah tayang
kotakBirthdayRouter.post('/menfess/reply', requireUser, (req, res) => {
  const menfessId = String(req.body?.menfessId || '').trim();
  const replyText = String(req.body?.text || '').trim().slice(0, 160);

  if (!menfessId) {
    return res.status(400).json({ error: 'ID Menfess tidak valid.' });
  }
  if (replyText.length < 2) {
    return res.status(400).json({ error: 'Balasan minimal 2 karakter.' });
  }

  db.prepare(`
    INSERT INTO menfess_replies (menfess_id, reply_text, created_at)
    VALUES (?, ?, ?)
  `).run(menfessId, replyText, Date.now());

  const replies = db.prepare(`
    SELECT id, menfess_id, reply_text, created_at
    FROM menfess_replies
    WHERE menfess_id = ?
    ORDER BY id ASC
    LIMIT 10
  `).all(menfessId);

  res.json({ ok: true, replies });
});

// 3. GET /api/birthday/status -> Cek apakah hari ini ulang tahun warga & status klaim kadonya
kotakBirthdayRouter.get('/birthday/status', requireUser, (req, res) => {
  const u = req.dbUser;
  const { year, mmdd } = todayWibParts();
  const rawBday = String(u.birthday || '').trim(); // Format tersimpan bisa DD-MM atau MM-DD

  let normalizedMmDd = '';
  if (/^\d{2}-\d{2}$/.test(rawBday)) {
    const parts = rawBday.split('-');
    // Jika bulan <= 12 dan hari > 12, pasti DD-MM -> ubah ke MM-DD
    if (Number(parts[1]) <= 12 && Number(parts[0]) > 12) {
      normalizedMmDd = `${parts[1]}-${parts[0]}`;
    } else {
      normalizedMmDd = rawBday;
    }
  }

  const isBirthdayToday = Boolean(normalizedMmDd && normalizedMmDd === mmdd);
  const claimedRow = db.prepare('SELECT 1 FROM birthday_claims WHERE user_id = ? AND year_key = ?')
    .get(String(u.id), year);

  res.json({
    isBirthdayToday,
    alreadyClaimed: Boolean(claimedRow),
    rewardPsc: 150
  });
});

// 4. POST /api/birthday/claim -> Klaim kado ulang tahun otomatis (+150 PSC & pengumuman grup)
kotakBirthdayRouter.post('/birthday/claim', requireUser, async (req, res) => {
  const u = req.dbUser;
  const { year, mmdd } = todayWibParts();
  const rawBday = String(u.birthday || '').trim();

  let normalizedMmDd = '';
  if (/^\d{2}-\d{2}$/.test(rawBday)) {
    const parts = rawBday.split('-');
    normalizedMmDd = (Number(parts[1]) <= 12 && Number(parts[0]) > 12)
      ? `${parts[1]}-${parts[0]}`
      : rawBday;
  }

  if (!normalizedMmDd || normalizedMmDd !== mmdd) {
    return res.status(400).json({ error: 'Hari ini bukan tanggal ulang tahun kamu (cek format DD-MM di profil).' });
  }

  const already = db.prepare('SELECT 1 FROM birthday_claims WHERE user_id = ? AND year_key = ?')
    .get(String(u.id), year);
  if (already) {
    return res.status(400).json({ error: 'Kado ulang tahun tahun ini sudah kamu klaim!' });
  }

  const now = Date.now();
  const bonusPsc = 150;

  const tx = db.transaction(() => {
    db.prepare('INSERT INTO birthday_claims (user_id, year_key, claimed_at) VALUES (?, ?, ?)')
      .run(String(u.id), year, now);
    db.prepare('UPDATE users SET psc = psc + ?, cred = cred + 5 WHERE id = ?')
      .run(bonusPsc, u.id);
    db.prepare('INSERT INTO transactions (user_id, type, amount, note, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(u.id, 'birthday', bonusPsc, `Kado ulang tahun PUNKSHIT.OS (${year})`, now);
  });
  tx();

  await broadcastToTelegram({
    target: 'group',
    text:
      `🎂 <b>SELAMAT ULANG TAHUN WARGA!</b>\n` +
      `HBD buat <b>${escHtml(u.name)}</b>! Semoga makin gacor di markas.\n` +
      `Mas Raka ngasih kado <b>+${bonusPsc} PSC</b> & <b>+5 Street Cred</b>!`,
    buttonText: '🎉 BUKA PUNKSHIT.OS',
    startParam: 'warga',
    feedText: `Selamat ulang tahun buat ${u.name}! (+${bonusPsc} PSC)`
  });

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(u.id);
  res.json({
    ok: true,
    message: `HBD ${u.name}! Kado +${bonusPsc} PSC & +5 Cred sudah masuk!`,
    user: formatUser(updated)
  });
});
