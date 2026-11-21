import express from 'express';
import crypto from 'crypto';
import { db } from '../database/db.js';
import { todayWib, formatUser, broadcastToTelegram, escHtml } from '../services/syncEngine.js';

export const gameRouter = express.Router();

// ==========================================
// 1. INISIALISASI TABEL ARENA GABUT 2.0
// ==========================================
db.exec(`
  CREATE TABLE IF NOT EXISTS arcade_profiles (
    user_id TEXT PRIMARY KEY,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    claimed_pass TEXT DEFAULT '[]',
    daily_date TEXT DEFAULT '',
    daily_stats TEXT DEFAULT '{}',
    claimed_quests TEXT DEFAULT '[]',
    personal_bests TEXT DEFAULT '{}',
    last_fish_batch_at INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS arcade_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    game TEXT NOT NULL,
    mode TEXT DEFAULT 'standard',
    payload TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS arcade_collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    category TEXT NOT NULL,
    item_key TEXT NOT NULL,
    name TEXT NOT NULL,
    rarity TEXT NOT NULL,
    weight REAL DEFAULT 0,
    sell_price INTEGER DEFAULT 0,
    is_sold INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS arcade_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    game TEXT NOT NULL,
    mode TEXT DEFAULT 'standard',
    score REAL NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

// ==========================================
// 2. DATA MASTER (IKAN, KOLEKSI, BANK SOAL)
// ==========================================
const FISH_POOL = [
  { key: 'sendal_jepit', name: 'Sendal Jepit Putus', rarity: 'Common', minW: 0.2, maxW: 0.5, price: 2, xp: 10, tension: 0.35, chance: 28 },
  { key: 'lele_kumis', name: 'Lele Kumis Panjang', rarity: 'Common', minW: 0.8, maxW: 2.5, price: 4, xp: 15, tension: 0.45, chance: 26 },
  { key: 'mujair_gang', name: 'Mujair Komplek', rarity: 'Uncommon', minW: 1.2, maxW: 3.8, price: 7, xp: 25, tension: 0.55, chance: 20 },
  { key: 'bawal_neon', name: 'Bawal Neon Y2K', rarity: 'Rare', minW: 2.5, maxW: 6.0, price: 14, xp: 40, tension: 0.68, chance: 14 },
  { key: 'arwana_cyber', name: 'Arwana Cyberpunk', rarity: 'Epic', minW: 4.0, maxW: 9.5, price: 28, xp: 70, tension: 0.80, chance: 8 },
  { key: 'golden_punkfish', name: 'Golden Punkfish', rarity: 'Legendary', minW: 8.5, maxW: 18.0, price: 65, xp: 150, tension: 0.90, chance: 4 }
];

const CLAW_POOL = [
  { key: 'stiker_raka', name: 'Stiker Mas Raka Ngopi', rarity: 'Common', price: 3, xp: 12, chance: 35 },
  { key: 'ganci_kaset', name: 'Gantungan Kaset Rusak', rarity: 'Uncommon', price: 6, xp: 20, chance: 28 },
  { key: 'boneka_punk', name: 'Boneka Maskot Punkshit', rarity: 'Rare', price: 12, xp: 35, chance: 20 },
  { key: 'tamagotchi_y2k', name: 'Tamagotchi Y2K', rarity: 'Epic', price: 25, xp: 65, chance: 12 },
  { key: 'mahkota_rongsok', name: 'Miniatur Mahkota Rongsok', rarity: 'Legendary', price: 50, xp: 120, chance: 5 }
];

const TRIVIA_BANK = [
  { cat: 'Punkshit', q: 'Apa mata uang resmi di dalam ekosistem PUNKSHIT.OS?', opts: ['Punk Coins (PSC)', 'Robux', 'Doge Coin', 'Rupiah Digital'], ans: 0 },
  { cat: 'Punkshit', q: 'Siapa nama bot penjaga markas PUNKSHIT.OS?', opts: ['Mas Agung', 'Mas Raka', 'Bang Jago', 'Pak RT'], ans: 1 },
  { cat: 'Punkshit', q: 'Gelar tertinggi saat streak absen tembus 60+ hari adalah...', opts: ['Pentolan Punkshit', 'Fosil Punkshit', 'Biang Kerok', 'Admin Pusat'], ans: 1 },
  { cat: 'Punkshit', q: 'Gelar awal untuk warga baru dengan streak di bawah 4 hari adalah...', opts: ['Anak Titipan', 'Anak Bawang', 'Tukang Nongki', 'Warga Baru'], ans: 1 },
  { cat: 'Internet & Meme', q: 'Apa kepanjangan dari AFK dalam istilah game online?', opts: ['Away From Keyboard', 'Always For Killing', 'After First Kill', 'Auto Farm King'], ans: 0 },
  { cat: 'Internet & Meme', q: 'Error kode HTTP saat halaman web tidak ditemukan adalah...', opts: ['500', '403', '404', '200'], ans: 2 },
  { cat: 'Internet & Meme', q: 'Tombol shortcut keyboard untuk meng-undo tindakan terakhir adalah...', opts: ['Ctrl + Y', 'Ctrl + Z', 'Ctrl + X', 'Alt + F4'], ans: 1 },
  { cat: 'Logika Receh', q: 'Jika ada 3 apel dan kamu ambil 2, berapa apel yang kamu punya?', opts: ['1 apel', '2 apel', '3 apel', '5 apel'], ans: 1 },
  { cat: 'Logika Receh', q: 'Bulan apa yang punya 28 hari?', opts: ['Cuma Februari', 'Februari saat kabisat', 'Semua bulan', 'Desember'], ans: 2 },
  { cat: 'Logika Receh', q: 'Benda apa yang kalau dipotong malah makin tinggi?', opts: ['Kuku', 'Celana panjang', 'Rambut', 'Tali sepatu'], ans: 1 },
  { cat: 'Musik & Pop', q: 'Gaya desain awal 2000-an dengan elemen glossy dan transparan disebut...', opts: ['Brutalism', 'Frutiger Aero', 'Minimalist', 'Flat Design'], ans: 1 },
  { cat: 'Musik & Pop', q: 'Genre musik punk cepat dengan durasi lagu rata-rata di bawah 2 menit adalah...', opts: ['Hardcore Punk', 'Shoegaze', 'City Pop', 'Lo-Fi'], ans: 0 },
  { cat: 'Random', q: 'Planet terdekat dengan Matahari di tata surya kita adalah...', opts: ['Venus', 'Mars', 'Merkurius', 'Bumi'], ans: 2 },
  { cat: 'Random', q: 'Berapa jumlah warna dasar pada pelangi (Mejikuhibiniu)?', opts: ['5 warna', '6 warna', '7 warna', '8 warna'], ans: 2 },
  { cat: 'Tebak Emoji', q: '🎸⚡🔥 — Kombinasi emoji ini paling pas menggambarkan...', opts: ['Konser Rock / Punk', 'Mancing Lele', 'Tidur Siang', 'Masak Mie'], ans: 0 }
];

const PASS_MILESTONES = [
  { level: 3, type: 'psc', amount: 100, label: '100 PSC' },
  { level: 5, type: 'collectible', key: 'frame_arcade_y2k', name: 'Frame Profil: Arcade Y2K', rarity: 'Rare', label: 'Frame Profil Arcade Y2K' },
  { level: 10, type: 'collectible', key: 'item_console_retro', name: 'Konsol Genggam Retro', rarity: 'Epic', label: 'Item Koleksi Spesial' },
  { level: 15, type: 'collectible', key: 'title_raja_gabut', name: 'Title: Raja Gabut', rarity: 'Epic', label: 'Title Eksklusif' },
  { level: 20, type: 'collectible', key: 'trophy_season_1', name: 'Piala Musim Arena 2.0', rarity: 'Legendary', label: 'Piala Musim' }
];

const DAILY_QUESTS_DEF = [
  { id: 'q_play1', title: 'Pemanasan Dulu', desc: 'Mainkan 1 game apa saja', target: 1, statKey: 'gamesPlayed', xp: 30, psc: 5 },
  { id: 'q_play3', title: 'Keliling Arena', desc: 'Mainkan 3 sesi game hari ini', target: 3, statKey: 'gamesPlayed', xp: 60, psc: 10 },
  { id: 'q_trivia5', title: 'Otak Masih Nyala', desc: 'Jawab 5 soal trivia dengan benar', target: 5, statKey: 'triviaCorrect', xp: 50, psc: 8 },
  { id: 'q_collect1', title: 'Kolektor Dadakan', desc: 'Dapatkan 1 ikan atau item koleksi', target: 1, statKey: 'itemsGot', xp: 45, psc: 7 }
];

// ==========================================
// 3. HELPER FUNCTIONS
// ==========================================
function getAuthUser(req, res) {
  const raw = req.user || req.tgUser || res.locals?.user;
  if (!raw || !raw.id) return null;
  return db.prepare('SELECT * FROM users WHERE id = ?').get(String(raw.id));
}

function weightedPick(pool) {
  const total = pool.reduce((acc, item) => acc + item.chance, 0);
  let r = Math.random() * total;
  for (const item of pool) {
    if (r < item.chance) return item;
    r -= item.chance;
  }
  return pool[0];
}

function calcLevelFromXp(xp) {
  // Setiap kelipatan 150 XP naik 1 level
  return Math.max(1, Math.floor((Number(xp) || 0) / 150) + 1);
}

function getOrCreateArcadeProfile(userId) {
  const uid = String(userId);
  const today = todayWib();
  let row = db.prepare('SELECT * FROM arcade_profiles WHERE user_id = ?').get(uid);

  if (!row) {
    db.prepare(`
      INSERT INTO arcade_profiles (user_id, xp, level, claimed_pass, daily_date, daily_stats, claimed_quests, personal_bests)
      VALUES (?, 0, 1, '[]', ?, '{}', '[]', '{}')
    `).run(uid, today);
    row = db.prepare('SELECT * FROM arcade_profiles WHERE user_id = ?').get(uid);
  } else if (row.daily_date !== today) {
    db.prepare(`
      UPDATE arcade_profiles
      SET daily_date = ?, daily_stats = '{}', claimed_quests = '[]'
      WHERE user_id = ?
    `).run(today, uid);
    row.daily_date = today;
    row.daily_stats = '{}';
    row.claimed_quests = '[]';
  }

  return {
    userId: row.user_id,
    xp: row.xp || 0,
    level: calcLevelFromXp(row.xp || 0),
    claimedPass: JSON.parse(row.claimed_pass || '[]'),
    dailyDate: row.daily_date,
    dailyStats: JSON.parse(row.daily_stats || '{}'),
    claimedQuests: JSON.parse(row.claimed_quests || '[]'),
    personalBests: JSON.parse(row.personal_bests || '{}'),
    lastFishBatchAt: row.last_fish_batch_at || 0
  };
}

function updateArcadeProgress(userId, { addXp = 0, statsInc = {}, newBest = null }) {
  const prof = getOrCreateArcadeProfile(userId);
  const newXp = prof.xp + Math.max(0, addXp);
  const newLevel = calcLevelFromXp(newXp);

  const stats = { ...prof.dailyStats };
  for (const [k, v] of Object.entries(statsInc)) {
    stats[k] = (stats[k] || 0) + v;
  }

  const bests = { ...prof.personalBests };
  if (newBest && newBest.game && typeof newBest.score === 'number') {
    const cur = bests[newBest.game];
    const isLowerBetter = newBest.game === 'react';
    if (cur === undefined || (isLowerBetter ? newBest.score < cur : newBest.score > cur)) {
      bests[newBest.game] = newBest.score;
    }
  }

  db.prepare(`
    UPDATE arcade_profiles
    SET xp = ?, level = ?, daily_stats = ?, personal_bests = ?
    WHERE user_id = ?
  `).run(newXp, newLevel, JSON.stringify(stats), JSON.stringify(bests), String(userId));

  return getOrCreateArcadeProfile(userId);
}

function getLeaderboards() {
  const reactTop = db.prepare(`
    SELECT user_name AS name, MIN(score) AS score
    FROM arcade_scores
    WHERE game = 'react' AND score >= 110
    GROUP BY user_id
    ORDER BY score ASC
    LIMIT 10
  `).all();

  const xpTop = db.prepare(`
    SELECT u.name, a.xp, a.level
    FROM arcade_profiles a
    JOIN users u ON u.id = a.user_id
    ORDER BY a.xp DESC
    LIMIT 10
  `).all();

  return { react: reactTop, xp: xpTop };
}

// ==========================================
// 4. ENDPOINT UTAMA ARENA GABUT 2.0
// ==========================================

// GET /api/arena/state — Muat seluruh status Arena, XP, Quest, Fishdex, Leaderboard
gameRouter.get('/arena/state', (req, res) => {
  const user = getAuthUser(req, res);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const today = todayWib();
  const profile = getOrCreateArcadeProfile(user.id);

  // Cek kuota mancing (maks 6x per sesi, cooldown 4 jam jika habis)
  const fourHoursMs = 4 * 3600 * 1000;
  let fishUsed = user.fish_date === today ? (user.fish_today || 0) : 0;
  if (fishUsed >= 6 && profile.lastFishBatchAt && (Date.now() - profile.lastFishBatchAt) >= fourHoursMs) {
    db.prepare('UPDATE users SET fish_today = 0 WHERE id = ?').run(user.id);
    fishUsed = 0;
  }

  const collections = db.prepare(`
    SELECT id, category, item_key, name, rarity, weight, sell_price, is_sold, created_at
    FROM arcade_collections
    WHERE user_id = ?
    ORDER BY id DESC
    LIMIT 100
  `).all(user.id);

  const quests = DAILY_QUESTS_DEF.map(q => {
    const progress = Math.min(q.target, profile.dailyStats[q.statKey] || 0);
    return {
      ...q,
      progress,
      done: progress >= q.target,
      claimed: profile.claimedQuests.includes(q.id)
    };
  });

  res.json({
    profile,
    passMilestones: PASS_MILESTONES,
    quests,
    fishQuota: {
      used: fishUsed,
      max: 6,
      left: Math.max(0, 6 - fishUsed),
      cooldownEndsAt: fishUsed >= 6 ? (profile.lastFishBatchAt + fourHoursMs) : 0
    },
    scratchedToday: user.scratched_date === today,
    collections,
    fishdexTotal: FISH_POOL.length,
    leaderboards: getLeaderboards()
  });
});

// POST /api/arena/session/start — Mulai sesi permainan tervalidasi server
gameRouter.post('/arena/session/start', (req, res) => {
  const user = getAuthUser(req, res);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { game, mode = 'standard' } = req.body || {};
  const today = todayWib();
  const now = Date.now();
  const sessionId = crypto.randomUUID();
  const profile = getOrCreateArcadeProfile(user.id);

  // Bersihkan sesi kedaluwarsa milik user
  db.prepare('DELETE FROM arcade_sessions WHERE user_id = ? AND expires_at < ?').run(user.id, now);

  if (game === 'fish') {
    const fourHoursMs = 4 * 3600 * 1000;
    let fishUsed = user.fish_date === today ? (user.fish_today || 0) : 0;

    if (fishUsed >= 6) {
      if (profile.lastFishBatchAt && (now - profile.lastFishBatchAt) >= fourHoursMs) {
        db.prepare('UPDATE users SET fish_today = 0 WHERE id = ?').run(user.id);
        fishUsed = 0;
      } else {
        const minsLeft = Math.ceil((fourHoursMs - (now - profile.lastFishBatchAt)) / 60000);
        return res.status(400).json({ error: `Kail lagi istirahat cuy! Tunggu ${Math.max(1, minsLeft)} menit lagi.` });
      }
    }

    const pickedFish = weightedPick(FISH_POOL);
    const weight = Number((pickedFish.minW + Math.random() * (pickedFish.maxW - pickedFish.minW)).toFixed(2));
    const biteDelayMs = 1500 + Math.floor(Math.random() * 2500);

    db.prepare(`
      INSERT INTO arcade_sessions (id, user_id, game, mode, payload, status, created_at, expires_at)
      VALUES (?, ?, 'fish', ?, ?, 'active', ?, ?)
    `).run(
      sessionId,
      user.id,
      mode,
      JSON.stringify({ fish: pickedFish, weight }),
      now,
      now + 3 * 60 * 1000
    );

    return res.json({
      sessionId,
      biteDelayMs,
      tensionDifficulty: pickedFish.tension,
      rarityHint: pickedFish.rarity === 'Legendary' || pickedFish.rarity === 'Epic' ? 'Tarikan berat banget!' : 'Ada pergerakan di air...'
    });
  }

  if (game === 'scratch') {
    if (user.scratched_date === today) {
      return res.status(400).json({ error: 'Kartu Gosok Nasib hari ini sudah dipakai. Balik lagi besok!' });
    }

    const roll = Math.random();
    let prize = { type: 'psc', psc: 5, xp: 20, label: '+5 PSC' };
    if (roll < 0.08) prize = { type: 'psc', psc: 35, xp: 60, label: 'JACKPOT +35 PSC!' };
    else if (roll < 0.28) prize = { type: 'psc', psc: 15, xp: 35, label: '+15 PSC' };
    else if (roll < 0.60) prize = { type: 'psc', psc: 8, xp: 25, label: '+8 PSC' };

    db.prepare(`
      INSERT INTO arcade_sessions (id, user_id, game, mode, payload, status, created_at, expires_at)
      VALUES (?, ?, 'scratch', 'daily', ?, 'active', ?, ?)
    `).run(sessionId, user.id, JSON.stringify({ prize }), now, now + 5 * 60 * 1000);

    return res.json({
      sessionId,
      prizePreview: prize.label
    });
  }

  if (game === 'claw') {
    const pickedItem = weightedPick(CLAW_POOL);
    // Peluang capit berhasil berdasarkan rarity
    const grabSuccessRate = pickedItem.rarity === 'Legendary' ? 0.45
      : pickedItem.rarity === 'Epic' ? 0.60
      : 0.80;

    db.prepare(`
      INSERT INTO arcade_sessions (id, user_id, game, mode, payload, status, created_at, expires_at)
      VALUES (?, ?, 'claw', ?, ?, 'active', ?, ?)
    `).run(
      sessionId,
      user.id,
      mode,
      JSON.stringify({ item: pickedItem, grabSuccessRate }),
      now,
      now + 3 * 60 * 1000
    );

    return res.json({
      sessionId,
      targetHint: pickedItem.name,
      rarity: pickedItem.rarity
    });
  }

  if (game === 'react') {
    db.prepare(`
      INSERT INTO arcade_sessions (id, user_id, game, mode, payload, status, created_at, expires_at)
      VALUES (?, ?, 'react', ?, '{}', 'active', ?, ?)
    `).run(sessionId, user.id, mode, now, now + 3 * 60 * 1000);

    return res.json({ sessionId, mode });
  }

  if (game === 'trivia') {
    const shuffled = [...TRIVIA_BANK].sort(() => Math.random() - 0.5).slice(0, 5);
    const answers = shuffled.map(q => q.ans);
    const clientQuestions = shuffled.map((q, idx) => ({
      index: idx,
      cat: q.cat,
      q: q.q,
      opts: q.opts
    }));

    db.prepare(`
      INSERT INTO arcade_sessions (id, user_id, game, mode, payload, status, created_at, expires_at)
      VALUES (?, ?, 'trivia', ?, ?, 'active', ?, ?)
    `).run(sessionId, user.id, mode, JSON.stringify({ answers }), now, now + 5 * 60 * 1000);

    return res.json({
      sessionId,
      questions: clientQuestions
    });
  }

  // Game Ekspansi (Gebuk Siapa, Adu Ingatan, Kabur Duluan, Ketuk Beat, Pantul Mania)
  const expansionGames = ['whack', 'memory', 'runner', 'beat', 'paddle'];
  if (expansionGames.includes(game)) {
    db.prepare(`
      INSERT INTO arcade_sessions (id, user_id, game, mode, payload, status, created_at, expires_at)
      VALUES (?, ?, ?, ?, '{}', 'active', ?, ?)
    `).run(sessionId, user.id, game, mode, now, now + 10 * 60 * 1000);

    return res.json({ sessionId, game, mode });
  }

  return res.status(400).json({ error: 'Jenis game tidak dikenali.' });
});

// POST /api/arena/session/finish — Validasi hasil permainan & berikan hadiah secara atomik
gameRouter.post('/arena/session/finish', async (req, res) => {
  const user = getAuthUser(req, res);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { sessionId, result = {} } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: 'Session ID wajib disertakan.' });

  const session = db.prepare('SELECT * FROM arcade_sessions WHERE id = ? AND user_id = ?').get(sessionId, user.id);
  if (!session) return res.status(404).json({ error: 'Sesi permainan tidak ditemukan.' });
  if (session.status !== 'active') return res.status(400).json({ error: 'Sesi ini sudah selesai atau sudah diklaim.' });

  const now = Date.now();
  if (now > session.expires_at) {
    db.prepare("UPDATE arcade_sessions SET status = 'expired' WHERE id = ?").run(sessionId);
    return res.status(400).json({ error: 'Sesi permainan sudah kedaluwarsa.' });
  }

  const elapsedMs = now - session.created_at;
  const payload = JSON.parse(session.payload || '{}');
  const today = todayWib();

  let pscEarned = 0;
  let xpEarned = 0;
  let resultText = '';
  let statsInc = { gamesPlayed: 1 };
  let newBest = null;
  let announceGroup = '';

  const runTx = db.transaction(() => {
    // Kunci sesi agar tidak bisa di-replay (Idempotency)
    db.prepare("UPDATE arcade_sessions SET status = 'finished' WHERE id = ?").run(sessionId);

    if (session.game === 'fish') {
      const curFishToday = user.fish_date === today ? (user.fish_today || 0) : 0;
      const nextFishToday = curFishToday + 1;

      db.prepare(`
        UPDATE users
        SET fish_date = ?, fish_today = ?, fish_count = fish_count + 1
        WHERE id = ?
      `).run(today, nextFishToday, user.id);

      if (nextFishToday >= 6) {
        db.prepare('UPDATE arcade_profiles SET last_fish_batch_at = ? WHERE user_id = ?').run(now, user.id);
      }

      if (!result.caught) {
        xpEarned = 5;
        resultText = 'Yah, ikannya lepas! Tarikan kurang pas. (+5 Arcade XP)';
        return;
      }

      const { fish, weight } = payload;
      xpEarned = fish.xp;
      statsInc.itemsGot = 1;

      db.prepare(`
        INSERT INTO arcade_collections (user_id, category, item_key, name, rarity, weight, sell_price, is_sold, created_at)
        VALUES (?, 'fish', ?, ?, ?, ?, ?, 0, ?)
      `).run(user.id, fish.key, fish.name, fish.rarity, weight, fish.price, now);

      resultText = `🎣 Dapat ${fish.name} [${fish.rarity}] seberat ${weight} kg! (+${xpEarned} XP)`;

      if (fish.rarity === 'Legendary') {
        announceGroup =
          `🎣 <b>TANGKAPAN LEGENDARY!</b>\n` +
          `<b>${escHtml(user.name)}</b> baru aja narik <b>${escHtml(fish.name)} (${weight} kg)</b> di Mancing Galatama!`;
      }
    }

    else if (session.game === 'scratch') {
      if (user.scratched_date === today) {
        throw new Error('Kartu hari ini sudah diklaim.');
      }
      const { prize } = payload;
      pscEarned = prize.psc || 0;
      xpEarned = prize.xp || 20;

      db.prepare('UPDATE users SET scratched_date = ?, psc = psc + ? WHERE id = ?').run(today, pscEarned, user.id);
      resultText = `🎟️ Kartu terbuka: ${prize.label} (+${xpEarned} Arcade XP)`;
    }

    else if (session.game === 'claw') {
      // Evaluasi ketepatan posisi capit dari client (0..100, tengah = 50) + peluang server
      const accuracy = Math.max(0, 1 - (Math.abs(Number(result.dropPos ?? 50) - 50) / 50));
      const success = accuracy >= 0.45 && Math.random() <= (payload.grabSuccessRate || 0.7);

      if (!success) {
        xpEarned = 8;
        resultText = '🕹️ Capit meleset! Barang jatuh lagi ke tumpukan rongsok. (+8 XP)';
        return;
      }

      const { item } = payload;
      xpEarned = item.xp;
      statsInc.itemsGot = 1;

      db.prepare(`
        INSERT INTO arcade_collections (user_id, category, item_key, name, rarity, weight, sell_price, is_sold, created_at)
        VALUES (?, 'claw', ?, ?, ?, 0, ?, 0, ?)
      `).run(user.id, item.key, item.name, item.rarity, item.price, now);

      resultText = `🕹️ Mantap! Berhasil nyapit ${item.name} [${item.rarity}]! (+${xpEarned} XP)`;
    }

    else if (session.game === 'react') {
      const avgMs = Math.round(Number(result.avgMs) || 0);
      // Anti-cheat: waktu reaksi manusia wajar >= 110ms
      if (avgMs < 110 || avgMs > 5000) {
        throw new Error('Skor refleks tidak valid atau terdeteksi anomali.');
      }

      db.prepare(`
        INSERT INTO arcade_scores (user_id, user_name, game, mode, score, created_at)
        VALUES (?, ?, 'react', ?, ?, ?)
      `).run(user.id, user.name, session.mode, avgMs, now);

      newBest = { game: 'react', score: avgMs };
      xpEarned = avgMs <= 260 ? 35 : avgMs <= 340 ? 25 : 15;
      pscEarned = avgMs <= 250 ? 4 : avgMs <= 320 ? 2 : 0;

      if (pscEarned > 0) {
        db.prepare('UPDATE users SET psc = psc + ? WHERE id = ?').run(pscEarned, user.id);
      }
      resultText = `⚡ Rata-rata refleks: ${avgMs} ms! (+${xpEarned} XP${pscEarned ? `, +${pscEarned} PSC` : ''})`;
    }

    else if (session.game === 'trivia') {
      const userAnswers = Array.isArray(result.answers) ? result.answers : [];
      const correctAnswers = payload.answers || [];
      let correctCount = 0;
      let maxCombo = 0;
      let curCombo = 0;

      for (let i = 0; i < correctAnswers.length; i++) {
        if (Number(userAnswers[i]) === Number(correctAnswers[i])) {
          correctCount++;
          curCombo++;
          if (curCombo > maxCombo) maxCombo = curCombo;
        } else {
          curCombo = 0;
        }
      }

      statsInc.triviaCorrect = correctCount;
      xpEarned = correctCount * 12 + maxCombo * 5;
      pscEarned = correctCount >= 4 ? 5 : correctCount >= 2 ? 2 : 0;

      if (pscEarned > 0) {
        db.prepare('UPDATE users SET psc = psc + ? WHERE id = ?').run(pscEarned, user.id);
      }

      const finalScore = correctCount * 100 + maxCombo * 20;
      db.prepare(`
        INSERT INTO arcade_scores (user_id, user_name, game, mode, score, created_at)
        VALUES (?, ?, 'trivia', ?, ?, ?)
      `).run(user.id, user.name, session.mode, finalScore, now);

      newBest = { game: 'trivia', score: finalScore };
      resultText = `🧠 Benar ${correctCount}/5 soal (Max Combo ${maxCombo}x)! (+${xpEarned} XP${pscEarned ? `, +${pscEarned} PSC` : ''})`;
    }

    else {
      // Game Ekspansi: whack, memory, runner, beat, paddle
      if (elapsedMs < 3000) {
        throw new Error('Durasi permainan terlalu singkat.');
      }
      const cleanScore = Math.max(0, Math.min(99999, Math.round(Number(result.score) || 0)));
      db.prepare(`
        INSERT INTO arcade_scores (user_id, user_name, game, mode, score, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(user.id, user.name, session.game, session.mode, cleanScore, now);

      newBest = { game: session.game, score: cleanScore };
      xpEarned = Math.min(50, Math.max(10, Math.floor(cleanScore / 20)));
      pscEarned = cleanScore >= 200 ? 3 : cleanScore >= 80 ? 1 : 0;

      if (pscEarned > 0) {
        db.prepare('UPDATE users SET psc = psc + ? WHERE id = ?').run(pscEarned, user.id);
      }
      resultText = `🎮 Skor tercatat: ${cleanScore}! (+${xpEarned} XP${pscEarned ? `, +${pscEarned} PSC` : ''})`;
    }
  });

  try {
    runTx();
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const updatedProfile = updateArcadeProgress(user.id, {
    addXp: xpEarned,
    statsInc,
    newBest
  });

  if (announceGroup) {
    broadcastToTelegram({
      target: 'group',
      text: announceGroup,
      buttonText: '🎣 IKUT MANCING',
      startParam: 'arena',
      feedText: `${user.name} narik tangkapan Legendary di Mancing Galatama!`
    }).catch(() => {});
  }

  const freshUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  res.json({
    ok: true,
    resultText,
    pscEarned,
    xpEarned,
    profile: updatedProfile,
    user: formatUser(freshUser)
  });
});

// POST /api/arena/fish/sell — Jual ikan atau item koleksi dari inventaris arena
gameRouter.post('/arena/fish/sell', (req, res) => {
  const user = getAuthUser(req, res);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { collectionId } = req.body || {};
  const item = db.prepare(`
    SELECT * FROM arcade_collections
    WHERE id = ? AND user_id = ? AND is_sold = 0
  `).get(Number(collectionId), user.id);

  if (!item) return res.status(404).json({ error: 'Item tidak ditemukan atau sudah dijual.' });
  if (!item.sell_price || item.sell_price <= 0) {
    return res.status(400).json({ error: 'Item koleksi spesial ini tidak bisa dijual.' });
  }

  const sellTx = db.transaction(() => {
    db.prepare('UPDATE arcade_collections SET is_sold = 1 WHERE id = ?').run(item.id);
    db.prepare('UPDATE users SET psc = psc + ? WHERE id = ?').run(item.sell_price, user.id);
  });
  sellTx();

  const freshUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  res.json({
    ok: true,
    message: `Berhasil jual ${item.name} seharga +${item.sell_price} PSC!`,
    user: formatUser(freshUser)
  });
});

// POST /api/arena/pass/claim — Klaim hadiah Arcade Pass Gratis berdasarkan Level
gameRouter.post('/arena/pass/claim', (req, res) => {
  const user = getAuthUser(req, res);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const targetLevel = Number(req.body?.level);
  const milestone = PASS_MILESTONES.find(m => m.level === targetLevel);
  if (!milestone) return res.status(400).json({ error: 'Milestone level tidak valid.' });

  const profile = getOrCreateArcadeProfile(user.id);
  if (profile.level < targetLevel) {
    return res.status(400).json({ error: `Level Arcade kamu belum mencapai Level ${targetLevel}.` });
  }
  if (profile.claimedPass.includes(targetLevel)) {
    return res.status(400).json({ error: 'Hadiah level ini sudah pernah diklaim.' });
  }

  const nextClaimed = [...profile.claimedPass, targetLevel];
  const passTx = db.transaction(() => {
    db.prepare('UPDATE arcade_profiles SET claimed_pass = ? WHERE user_id = ?')
      .run(JSON.stringify(nextClaimed), user.id);

    if (milestone.type === 'psc') {
      db.prepare('UPDATE users SET psc = psc + ? WHERE id = ?').run(milestone.amount, user.id);
    } else if (milestone.type === 'collectible') {
      db.prepare(`
        INSERT INTO arcade_collections (user_id, category, item_key, name, rarity, weight, sell_price, is_sold, created_at)
        VALUES (?, 'pass', ?, ?, ?, 0, 0, 0, ?)
      `).run(user.id, milestone.key, milestone.name, milestone.rarity, Date.now());
    }
  });
  passTx();

  const freshUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  res.json({
    ok: true,
    message: `Hadiah Arcade Pass Lv.${targetLevel} (${milestone.label}) berhasil diklaim!`,
    profile: getOrCreateArcadeProfile(user.id),
    user: formatUser(freshUser)
  });
});

// POST /api/arena/quest/claim — Klaim hadiah Daily Quest
gameRouter.post('/arena/quest/claim', (req, res) => {
  const user = getAuthUser(req, res);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { questId } = req.body || {};
  const quest = DAILY_QUESTS_DEF.find(q => q.id === questId);
  if (!quest) return res.status(400).json({ error: 'Quest tidak ditemukan.' });

  const profile = getOrCreateArcadeProfile(user.id);
  const progress = profile.dailyStats[quest.statKey] || 0;
  if (progress < quest.target) {
    return res.status(400).json({ error: 'Syarat quest belum selesai.' });
  }
  if (profile.claimedQuests.includes(quest.id)) {
    return res.status(400).json({ error: 'Quest ini sudah diklaim hari ini.' });
  }

  const nextClaimed = [...profile.claimedQuests, quest.id];
  const questTx = db.transaction(() => {
    db.prepare('UPDATE arcade_profiles SET claimed_quests = ? WHERE user_id = ?')
      .run(JSON.stringify(nextClaimed), user.id);
    db.prepare('UPDATE users SET psc = psc + ? WHERE id = ?').run(quest.psc, user.id);
  });
  questTx();

  const updatedProfile = updateArcadeProgress(user.id, { addXp: quest.xp });
  const freshUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);

  res.json({
    ok: true,
    message: `Quest "${quest.title}" selesai! +${quest.psc} PSC & +${quest.xp} Arcade XP.`,
    profile: updatedProfile,
    user: formatUser(freshUser)
  });
});

// ==========================================
// 5. COMPATIBILITY ENDPOINTS (VERSI LAMA)
// ==========================================
gameRouter.post('/game/play', (req, res) => {
  const user = getAuthUser(req, res);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  res.status(400).json({ error: 'Silakan refresh Mini App untuk menggunakan Arena Gabut 2.0!' });
});

gameRouter.post('/game/score', (req, res) => {
  const user = getAuthUser(req, res);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  res.status(400).json({ error: 'Silakan refresh Mini App untuk menggunakan Arena Gabut 2.0!' });
});

export default gameRouter;
