import express from 'express';
import crypto from 'crypto';
import { db } from '../database/db.js';
import { todayWib, formatUser, broadcastToTelegram, escHtml } from '../services/syncEngine.js';

export const gameRouter = express.Router();

const DAILY_PSC_CAP = 120;

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
// 2. DATA MASTER (15 SPESIES IKAN, 3 BOX CAPIT, 36+ BANK SOAL)
// ==========================================
const FISH_POOLS = {
  pinggir: [
    { key: 'lele_kaleng', name: 'Lele Kaleng Sarden', rarity: 'Common', minW: 0.5, maxW: 1.4, price: 6, xp: 14, tension: 0.34, chance: 34 },
    { key: 'mujair_punk', name: 'Mujair Mohawk', rarity: 'Common', minW: 0.8, maxW: 1.9, price: 7, xp: 16, tension: 0.38, chance: 30 },
    { key: 'nila_neon', name: 'Nila Neon', rarity: 'Common', minW: 1.0, maxW: 2.3, price: 8, xp: 18, tension: 0.42, chance: 22 },
    { key: 'gabus_preman', name: 'Gabus Preman Kali', rarity: 'Uncommon', minW: 1.8, maxW: 3.5, price: 12, xp: 26, tension: 0.48, chance: 14 }
  ],
  tengah: [
    { key: 'bawal_baja', name: 'Bawal Baja', rarity: 'Uncommon', minW: 2.2, maxW: 4.5, price: 14, xp: 28, tension: 0.55, chance: 32 },
    { key: 'gurame_asap', name: 'Gurame Asap Sunda', rarity: 'Uncommon', minW: 2.8, maxW: 5.2, price: 16, xp: 32, tension: 0.58, chance: 28 },
    { key: 'patin_emas', name: 'Patin Emas Cipaganti', rarity: 'Rare', minW: 4.0, maxW: 7.5, price: 22, xp: 45, tension: 0.65, chance: 20 },
    { key: 'kakap_merah', name: 'Kakap Merah Karang', rarity: 'Rare', minW: 4.8, maxW: 8.8, price: 24, xp: 50, tension: 0.68, chance: 13 },
    { key: 'arwana_super', name: 'Arwana Super Red', rarity: 'Epic', minW: 3.5, maxW: 6.5, price: 32, xp: 70, tension: 0.75, chance: 7 }
  ],
  palung: [
    { key: 'pari_listrik', name: 'Pari Listrik Tegangan Tinggi', rarity: 'Epic', minW: 10.0, maxW: 22.0, price: 34, xp: 75, tension: 0.82, chance: 32 },
    { key: 'hiu_martil', name: 'Hiu Martil Besi', rarity: 'Epic', minW: 18.0, maxW: 42.0, price: 36, xp: 85, tension: 0.85, chance: 28 },
    { key: 'tuna_sirip_biru', name: 'Tuna Sirip Biru', rarity: 'Legendary', minW: 30.0, maxW: 65.0, price: 42, xp: 110, tension: 0.89, chance: 18 },
    { key: 'oarfish_naga', name: 'Oarfish Naga Palung', rarity: 'Legendary', minW: 40.0, maxW: 85.0, price: 45, xp: 125, tension: 0.91, chance: 12 },
    { key: 'coelacanth_purba', name: 'Coelacanth Purba', rarity: 'Mythic', minW: 50.0, maxW: 95.0, price: 55, xp: 160, tension: 0.94, chance: 6 },
    { key: 'raja_lele_gaib', name: 'Raja Lele Penunggu Rawa', rarity: 'Mythic', minW: 66.6, maxW: 99.9, price: 60, xp: 180, tension: 0.96, chance: 4 }
  ]
};

const ALL_FISH_COUNT = Object.values(FISH_POOLS).reduce((sum, arr) => sum + arr.length, 0);

const CLAW_BOX_POOLS = {
  rongsok: [
    { key: 'kaset_walkman', name: 'Kaset Pita Walkman Kusut', rarity: 'Common', price: 8, xp: 15, rate: 0.85, chance: 35 },
    { key: 'pin_peniti', name: 'Pin Peniti Tengkorak', rarity: 'Common', price: 9, xp: 18, rate: 0.82, chance: 30 },
    { key: 'komik_98', name: 'Komik Bekas Tahun 98', rarity: 'Uncommon', price: 12, xp: 24, rate: 0.76, chance: 20 },
    { key: 'kacamata_pixel', name: 'Kacamata Hitam Pixel', rarity: 'Uncommon', price: 14, xp: 28, rate: 0.72, chance: 15 }
  ],
  retro: [
    { key: 'tamagotchi_nyala', name: 'Tamagotchi Jadul Nyala', rarity: 'Rare', price: 16, xp: 35, rate: 0.68, chance: 34 },
    { key: 'gameboy_ungu', name: 'GameBoy Transparan Ungu', rarity: 'Rare', price: 20, xp: 42, rate: 0.64, chance: 30 },
    { key: 'walkman_sony', name: 'Walkman Sony Kuning', rarity: 'Epic', price: 24, xp: 55, rate: 0.58, chance: 22 },
    { key: 'techdeck_mini', name: 'Skateboard Mini TechDeck', rarity: 'Epic', price: 26, xp: 62, rate: 0.55, chance: 14 }
  ],
  boss: [
    { key: 'jaket_studded', name: 'Jaket Kulit Studded Edisi Tour', rarity: 'Legendary', price: 32, xp: 85, rate: 0.48, chance: 36 },
    { key: 'gitar_gibson', name: 'Gitar Listrik Mini Gibson', rarity: 'Legendary', price: 36, xp: 95, rate: 0.44, chance: 30 },
    { key: 'helm_chrome', name: 'Helm Retro Chrome Punk', rarity: 'Mythic', price: 42, xp: 125, rate: 0.38, chance: 20 },
    { key: 'kunci_brankas', name: 'Kunci Brankas Mas Raka', rarity: 'Mythic', price: 45, xp: 145, rate: 0.34, chance: 14 }
  ]
};

const TRIVIA_BANK = {
  easy: [
    { cat: 'Nusantara', q: 'Apa nama ibu kota Provinsi Jawa Barat?', opts: ['Bandung', 'Bogor', 'Cirebon', 'Bekasi'], ans: 0 },
    { cat: 'Punkshit', q: 'Apa mata uang resmi di dalam ekosistem PUNKSHIT.OS?', opts: ['Punk Coins (PSC)', 'Robux', 'Doge Coin', 'Rupiah Digital'], ans: 0 },
    { cat: 'Punkshit', q: 'Siapa nama bot penjaga markas PUNKSHIT.OS?', opts: ['Mas Agung', 'Mas Raka', 'Bang Jago', 'Pak RT'], ans: 1 },
    { cat: 'Sains Dasar', q: 'Planet terdekat dengan Matahari di tata surya kita adalah...', opts: ['Venus', 'Mars', 'Merkurius', 'Bumi'], ans: 2 },
    { cat: 'Logika', q: 'Jika kemarin adalah hari Rabu, maka lusa adalah hari...', opts: ['Jumat', 'Sabtu', 'Minggu', 'Kamis'], ans: 1 },
    { cat: 'Umum', q: 'Simbol kimia untuk air murni adalah...', opts: ['CO2', 'H2O', 'O2', 'NaCl'], ans: 1 },
    { cat: 'Kuliner', q: 'Makanan khas Bandung berbahan dasar aci yang digoreng dan dibumbui pedas adalah...', opts: ['Pempek', 'Cireng', 'Gudeg', 'Rawon'], ans: 1 },
    { cat: 'Teknologi', q: 'Tombol pintasan keyboard untuk menyalin (Copy) teks di Windows adalah...', opts: ['Ctrl + V', 'Ctrl + X', 'Ctrl + C', 'Ctrl + Z'], ans: 2 },
    { cat: 'Musik', q: 'Berapa jumlah senar standar pada gitar akustik biasa?', opts: ['4 senar', '5 senar', '6 senar', '7 senar'], ans: 2 },
    { cat: 'Alam', q: 'Hewan mamalia terbesar yang hidup di lautan adalah...', opts: ['Hiu Paus', 'Paus Biru', 'Orca', 'Cumi Raksasa'], ans: 1 },
    { cat: 'Nusantara', q: 'Danau vulkanik terbesar di Indonesia yang berada di Sumatera Utara adalah...', opts: ['Danau Maninjau', 'Danau Toba', 'Danau Singkarak', 'Danau Poso'], ans: 1 },
    { cat: 'Logika', q: 'Bulan apa dalam kalender Masehi yang memiliki 28 atau 29 hari?', opts: ['Januari', 'Februari', 'April', 'September'], ans: 1 }
  ],
  medium: [
    { cat: 'Musik Indie', q: 'Lagu "Cincin" yang populer di skena indie Indonesia dinyanyikan oleh...', opts: ['Sal Priadi', 'Hindia', 'Pamungkas', 'Kunto Aji'], ans: 1 },
    { cat: 'Sains', q: 'Bagian mata manusia yang berfungsi mengatur banyak sedikitnya cahaya yang masuk adalah...', opts: ['Retina', 'Kornea', 'Pupil & Iris', 'Lensa'], ans: 2 },
    { cat: 'Sejarah', q: 'Konferensi Asia Afrika (KAA) pertama kali diselenggarakan di kota Bandung pada tahun...', opts: ['1950', '1955', '1960', '1965'], ans: 1 },
    { cat: 'Teknologi', q: 'Error kode HTTP saat halaman web tidak ditemukan adalah...', opts: ['500', '403', '404', '200'], ans: 2 },
    { cat: 'Geografi', q: 'Selat yang memisahkan Pulau Jawa dan Pulau Sumatera adalah...', opts: ['Selat Bali', 'Selat Sunda', 'Selat Malaka', 'Selat Makassar'], ans: 1 },
    { cat: 'Logika', q: 'Lanjutkan deret angka berikut: 2, 6, 12, 20, 30, ...', opts: ['38', '40', '42', '44'], ans: 2 },
    { cat: 'Astronomi', q: 'Satelit alami terbesar yang mengorbit planet Saturnus bernama...', opts: ['Europa', 'Ganymede', 'Titan', 'Phobos'], ans: 2 },
    { cat: 'Budaya Pop', q: 'Gaya desain awal 2000-an dengan elemen glossy dan transparan disebut...', opts: ['Brutalism', 'Frutiger Aero', 'Minimalist', 'Flat Design'], ans: 1 },
    { cat: 'Sains', q: 'Gas yang paling banyak menyusun atmosfer Bumi (sekitar 78%) adalah...', opts: ['Oksigen', 'Karbon Dioksida', 'Nitrogen', 'Argon'], ans: 2 },
    { cat: 'Teknik', q: 'Satuan standar internasional (SI) untuk mengukur kuat arus listrik adalah...', opts: ['Volt', 'Watt', 'Ampere', 'Ohm'], ans: 2 },
    { cat: 'Nusantara', q: 'Alat musik tradisional Jawa Barat yang terbuat dari bambu dan dimainkan dengan digoyangkan adalah...', opts: ['Sasando', 'Angklung', 'Kolintang', 'Tifa'], ans: 1 },
    { cat: 'Logika', q: 'Sebuah jam dinding berbunyi 3 kali dalam 6 detik. Berapa detik waktu yang dibutuhkan untuk berbunyi 6 kali?', opts: ['12 detik', '15 detik', '18 detik', '10 detik'], ans: 1 }
  ],
  hard: [
    { cat: 'Fisika', q: 'Fenomena pembelokan cahaya saat melewati celah sempit atau tepi penghalang disebut...', opts: ['Refraksi', 'Difraksi', 'Polarisasi', 'Dispersi'], ans: 1 },
    { cat: 'Sejarah Dunia', q: 'Perpustakaan kuno paling terkenal di dunia Mediterania yang terletak di Mesir adalah Perpustakaan...', opts: ['Pergamum', 'Alexandria', 'Nineveh', 'Ephesus'], ans: 1 },
    { cat: 'Logika Ketat', q: 'Jika semua A adalah B, dan sebagian B adalah C, maka kesimpulan yang PASTI benar adalah...', opts: ['Semua A adalah C', 'Sebagian A adalah C', 'Semua B adalah A', 'Tidak dapat dipastikan A bagian dari C'], ans: 3 },
    { cat: 'Biologi', q: 'Organel sel yang dijuluki sebagai "powerhouse of the cell" penghasil energi ATP adalah...', opts: ['Ribosom', 'Mitokondria', 'Lisosom', 'Badan Golgi'], ans: 1 },
    { cat: 'Teknologi', q: 'Dalam protokol HTTP, kode status 403 memiliki arti...', opts: ['Not Found', 'Unauthorized', 'Forbidden', 'Bad Gateway'], ans: 2 },
    { cat: 'Geografi Dunia', q: 'Titik terdalam di samudra Bumi yang terletak di Samudra Pasifik adalah Palung...', opts: ['Tonga', 'Mariana', 'Java', 'Puerto Rico'], ans: 1 },
    { cat: 'Matematika', q: 'Berapa nilai dari 2^5 + 3^3?', opts: ['59', '57', '61', '55'], ans: 0 },
    { cat: 'Kimia', q: 'Unsur kimia dengan nomor atom 79 yang memiliki simbol Au adalah...', opts: ['Perak', 'Platinum', 'Emas', 'Raksa'], ans: 2 },
    { cat: 'Astronomi', q: 'Jarak rata-rata dari Bumi ke Matahari yang dijadikan satuan astronomi (1 AU) adalah sekitar...', opts: ['15 juta km', '150 juta km', '1,5 miliar km', '384 ribu km'], ans: 1 },
    { cat: 'Sejarah', q: 'Kerajaan maritim besar di Nusantara yang berpusat di Sumatera dan menguasai jalur Selat Malaka adalah...', opts: ['Majapahit', 'Singhasari', 'Sriwijaya', 'Tarumanegara'], ans: 2 },
    { cat: 'Logika', q: 'Ada 3 saklar di luar ruangan tertutup untuk 1 bohlam di dalam. Kamu hanya boleh masuk 1 kali untuk tahu saklar mana yang menyalakannya. Caranya?', opts: ['Nyalakan semua', 'Nyalakan 1 lama lalu matikan, nyalakan 1 lagi, cek panas & cahaya bohlam', 'Tebak acak', 'Nyalakan bergantian 1 detik'], ans: 1 },
    { cat: 'Sains', q: 'Kecepatan cahaya di ruang hampa mendekati angka...', opts: ['300.000 km/detik', '30.000 km/detik', '3.000 km/detik', '150.000 km/detik'], ans: 0 }
  ]
};

const PASS_MILESTONES = [
  { level: 3, type: 'psc', amount: 80, label: '80 PSC' },
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

function clampDailyPsc(userId, desiredPsc) {
  const want = Math.max(0, Math.round(Number(desiredPsc) || 0));
  if (want <= 0) return { awarded: 0, capped: false };
  const prof = getOrCreateArcadeProfile(userId);
  const earnedSoFar = Number(prof.dailyStats.pscEarnedToday || 0);
  const remaining = Math.max(0, DAILY_PSC_CAP - earnedSoFar);
  const awarded = Math.min(want, remaining);
  return { awarded, capped: awarded < want };
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
gameRouter.get('/arena/state', (req, res) => {
  const user = getAuthUser(req, res);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const today = todayWib();
  const profile = getOrCreateArcadeProfile(user.id);

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
    dailyPscEarned: Number(profile.dailyStats.pscEarnedToday || 0),
    dailyPscCap: DAILY_PSC_CAP,
    collections,
    fishdexTotal: ALL_FISH_COUNT,
    leaderboards: getLeaderboards()
  });
});

gameRouter.post('/arena/session/start', (req, res) => {
  const user = getAuthUser(req, res);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { game, mode = 'standard' } = req.body || {};
  const today = todayWib();
  const now = Date.now();
  const sessionId = crypto.randomUUID();
  const profile = getOrCreateArcadeProfile(user.id);

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

    const spotKey = FISH_POOLS[mode] ? mode : 'pinggir';
    const pickedFish = weightedPick(FISH_POOLS[spotKey]);
    const weight = Number((pickedFish.minW + Math.random() * (pickedFish.maxW - pickedFish.minW)).toFixed(2));
    const biteDelayMs = 1400 + Math.floor(Math.random() * 2200);

    db.prepare(`
      INSERT INTO arcade_sessions (id, user_id, game, mode, payload, status, created_at, expires_at)
      VALUES (?, ?, 'fish', ?, ?, 'active', ?, ?)
    `).run(
      sessionId,
      user.id,
      spotKey,
      JSON.stringify({ fish: pickedFish, weight, spot: spotKey }),
      now,
      now + 3 * 60 * 1000
    );

    return res.json({
      sessionId,
      biteDelayMs,
      tensionDifficulty: pickedFish.tension,
      rarityHint: pickedFish.rarity === 'Mythic' || pickedFish.rarity === 'Legendary'
        ? 'Tarikan monster kedalaman!'
        : pickedFish.rarity === 'Epic'
          ? 'Tarikan berat banget!'
          : 'Pelampung mulai bergerak...'
    });
  }

  if (game === 'scratch') {
    if (user.scratched_date === today) {
      return res.status(400).json({ error: 'Kartu Gosok Nasib hari ini sudah dipakai. Balik lagi besok!' });
    }

    const roll = Math.random();
    let prize = { type: 'psc', psc: 6, xp: 20, label: '+6 PSC' };
    if (roll < 0.06) prize = { type: 'psc', psc: 40, xp: 65, label: 'JACKPOT +40 PSC!' };
    else if (roll < 0.24) prize = { type: 'psc', psc: 18, xp: 35, label: '+18 PSC' };
    else if (roll < 0.58) prize = { type: 'psc', psc: 10, xp: 25, label: '+10 PSC' };

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
    const boxKey = CLAW_BOX_POOLS[mode] ? mode : 'rongsok';
    const pickedItem = weightedPick(CLAW_BOX_POOLS[boxKey]);

    db.prepare(`
      INSERT INTO arcade_sessions (id, user_id, game, mode, payload, status, created_at, expires_at)
      VALUES (?, ?, 'claw', ?, ?, 'active', ?, ?)
    `).run(
      sessionId,
      user.id,
      boxKey,
      JSON.stringify({ item: pickedItem, grabSuccessRate: pickedItem.rate, box: boxKey }),
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
    const tierKey = ['classic', 'bo5', 'nightmare'].includes(mode) ? mode : 'classic';
    db.prepare(`
      INSERT INTO arcade_sessions (id, user_id, game, mode, payload, status, created_at, expires_at)
      VALUES (?, ?, 'react', ?, '{}', 'active', ?, ?)
    `).run(sessionId, user.id, tierKey, now, now + 3 * 60 * 1000);

    return res.json({ sessionId, mode: tierKey });
  }

  if (game === 'trivia') {
    const tierKey = TRIVIA_BANK[mode] ? mode : 'medium';
    const count = tierKey === 'hard' ? 6 : 5;
    const shuffled = [...TRIVIA_BANK[tierKey]].sort(() => Math.random() - 0.5).slice(0, count);
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
    `).run(sessionId, user.id, tierKey, JSON.stringify({ answers, tier: tierKey }), now, now + 5 * 60 * 1000);

    return res.json({
      sessionId,
      questions: clientQuestions
    });
  }

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
        xpEarned = 6;
        resultText = 'Yah, ikannya lepas! Tarikan kurang pas. (+6 Arcade XP)';
        return;
      }

      const { fish, weight } = payload;
      xpEarned = fish.xp;
      statsInc.itemsGot = 1;

      db.prepare(`
        INSERT INTO arcade_collections (user_id, category, item_key, name, rarity, weight, sell_price, is_sold, created_at)
        VALUES (?, 'fish', ?, ?, ?, ?, ?, 0, ?)
      `).run(user.id, fish.key, fish.name, fish.rarity, weight, fish.price, now);

      resultText = `🎣 Dapat ${fish.name} [${fish.rarity}] seberat ${weight} kg! Nilai jual: ${fish.price} PSC (+${xpEarned} XP)`;

      if (fish.rarity === 'Legendary' || fish.rarity === 'Mythic') {
        announceGroup =
          `🎣 <b>TANGKAPAN ${fish.rarity.toUpperCase()}!</b>\n` +
          `<b>${escHtml(user.name)}</b> baru aja narik <b>${escHtml(fish.name)} (${weight} kg)</b> di Mancing Galatama!`;
      }
    }

    else if (session.game === 'scratch') {
      if (user.scratched_date === today) {
        throw new Error('Kartu hari ini sudah diklaim.');
      }
      const { prize } = payload;
      const capped = clampDailyPsc(user.id, prize.psc || 0);
      pscEarned = capped.awarded;
      xpEarned = prize.xp || 20;
      if (pscEarned > 0) statsInc.pscEarnedToday = pscEarned;

      db.prepare('UPDATE users SET scratched_date = ?, psc = psc + ? WHERE id = ?').run(today, pscEarned, user.id);
      resultText = `🎟️ Kartu terbuka: +${pscEarned} PSC (+${xpEarned} Arcade XP)` + (capped.capped ? ' [Limit harian tercapai]' : '');
    }

    else if (session.game === 'claw') {
      const targetCenter = Number(result.targetPos ?? 50);
      const accuracy = Math.max(0, 1 - (Math.abs(Number(result.dropPos ?? 50) - targetCenter) / 45));
      const success = accuracy >= 0.45 && Math.random() <= (payload.grabSuccessRate || 0.7);

      if (!success) {
        xpEarned = 8;
        resultText = '🕹️ Capit meleset! Barang jatuh lagi ke dalam kotak. (+8 XP)';
        return;
      }

      const { item } = payload;
      xpEarned = item.xp;
      statsInc.itemsGot = 1;

      db.prepare(`
        INSERT INTO arcade_collections (user_id, category, item_key, name, rarity, weight, sell_price, is_sold, created_at)
        VALUES (?, 'claw', ?, ?, ?, 0, ?, 0, ?)
      `).run(user.id, item.key, item.name, item.rarity, item.price, now);

      resultText = `🕹️ Mantap! Berhasil nyapit ${item.name} [${item.rarity}]! Nilai jual: ${item.price} PSC (+${xpEarned} XP)`;
    }

    else if (session.game === 'react') {
      const avgMs = Math.round(Number(result.avgMs) || 0);
      if (avgMs < 110 || avgMs > 5000) {
        throw new Error('Skor refleks tidak valid atau terdeteksi anomali.');
      }

      const tier = result.tier || session.mode || 'classic';
      db.prepare(`
        INSERT INTO arcade_scores (user_id, user_name, game, mode, score, created_at)
        VALUES (?, ?, 'react', ?, ?, ?)
      `).run(user.id, user.name, tier, avgMs, now);

      newBest = { game: 'react', score: avgMs };
      const mult = tier === 'nightmare' ? 2.2 : tier === 'bo5' ? 1.5 : 1;
      xpEarned = Math.round((avgMs <= 260 ? 32 : avgMs <= 340 ? 22 : 14) * mult);
      const rawPsc = avgMs <= 250 ? Math.round(6 * mult) : avgMs <= 320 ? Math.round(3 * mult) : 1;
      const capped = clampDailyPsc(user.id, rawPsc);
      pscEarned = capped.awarded;
      if (pscEarned > 0) {
        statsInc.pscEarnedToday = pscEarned;
        db.prepare('UPDATE users SET psc = psc + ? WHERE id = ?').run(pscEarned, user.id);
      }
      resultText = `⚡ Rata-rata refleks (${tier.toUpperCase()}): ${avgMs} ms! (+${xpEarned} XP${pscEarned ? `, +${pscEarned} PSC` : ''})`;
    }

    else if (session.game === 'trivia') {
      const userAnswers = Array.isArray(result.answers) ? result.answers : [];
      const correctAnswers = payload.answers || [];
      const tier = payload.tier || session.mode || 'medium';
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
      const tierMult = tier === 'hard' ? 2.0 : tier === 'medium' ? 1.4 : 1.0;
      xpEarned = Math.round((correctCount * 12 + maxCombo * 5) * tierMult);
      const rawPsc = correctCount >= 4 ? Math.round(8 * tierMult) : correctCount >= 2 ? Math.round(4 * tierMult) : 0;
      const capped = clampDailyPsc(user.id, rawPsc);
      pscEarned = capped.awarded;

      if (pscEarned > 0) {
        statsInc.pscEarnedToday = pscEarned;
        db.prepare('UPDATE users SET psc = psc + ? WHERE id = ?').run(pscEarned, user.id);
      }

      const finalScore = Math.round((correctCount * 100 + maxCombo * 20) * tierMult);
      db.prepare(`
        INSERT INTO arcade_scores (user_id, user_name, game, mode, score, created_at)
        VALUES (?, ?, 'trivia', ?, ?, ?)
      `).run(user.id, user.name, tier, finalScore, now);

      newBest = { game: 'trivia', score: finalScore };
      resultText = `🧠 Benar ${correctCount}/${correctAnswers.length} soal [${tier.toUpperCase()}] (Combo ${maxCombo}x)! (+${xpEarned} XP${pscEarned ? `, +${pscEarned} PSC` : ''})`;
    }

    else {
      if (elapsedMs < 3000) {
        throw new Error('Durasi permainan terlalu singkat.');
      }
      const tier = result.tier || session.mode || 'medium';
      const tierMult = tier === 'hard' ? 1.8 : tier === 'medium' ? 1.3 : 1.0;
      const cleanScore = Math.max(0, Math.min(99999, Math.round(Number(result.score) || 0)));
      db.prepare(`
        INSERT INTO arcade_scores (user_id, user_name, game, mode, score, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(user.id, user.name, session.game, tier, cleanScore, now);

      newBest = { game: session.game, score: cleanScore };
      xpEarned = Math.min(70, Math.max(12, Math.round((cleanScore / 18) * tierMult)));
      const rawPsc = cleanScore >= 220 ? Math.round(8 * tierMult) : cleanScore >= 100 ? Math.round(4 * tierMult) : 1;
      const capped = clampDailyPsc(user.id, rawPsc);
      pscEarned = capped.awarded;

      if (pscEarned > 0) {
        statsInc.pscEarnedToday = pscEarned;
        db.prepare('UPDATE users SET psc = psc + ? WHERE id = ?').run(pscEarned, user.id);
      }
      resultText = `🎮 Skor [${tier.toUpperCase()}]: ${cleanScore}! (+${xpEarned} XP${pscEarned ? `, +${pscEarned} PSC` : ''})`;
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
      feedText: `${user.name} narik tangkapan langka di Mancing Galatama!`
    }).catch(() => {});
  }

  const freshUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  res.json({
    ok: true,
    resultText,
    pscEarned,
    xpEarned,
    dailyPscEarned: Number(updatedProfile.dailyStats.pscEarnedToday || 0),
    dailyPscCap: DAILY_PSC_CAP,
    profile: updatedProfile,
    user: formatUser(freshUser)
  });
});

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
