import { db } from '../../database/db.js';
import { todayWib } from '../../services/syncEngine.js';

export const DAILY_PSC_CAP = 300;

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

export const FISH_POOLS = {
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

export const ALL_FISH_COUNT = Object.values(FISH_POOLS).reduce((sum, arr) => sum + arr.length, 0);

export const CLAW_BOX_POOLS = {
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

export const TRIVIA_BANK = {
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

export const PASS_MILESTONES = [
  { level: 3, type: 'psc', amount: 80, label: '80 PSC' },
  { level: 5, type: 'collectible', key: 'frame_arcade_y2k', name: 'Frame Profil: Arcade Y2K', rarity: 'Rare', label: 'Frame Profil Arcade Y2K' },
  { level: 10, type: 'collectible', key: 'item_console_retro', name: 'Konsol Genggam Retro', rarity: 'Epic', label: 'Item Koleksi Spesial' },
  { level: 15, type: 'collectible', key: 'title_raja_gabut', name: 'Title: Raja Gabut', rarity: 'Epic', label: 'Title Eksklusif' },
  { level: 20, type: 'collectible', key: 'trophy_season_1', name: 'Piala Musim Arena 2.0', rarity: 'Legendary', label: 'Piala Musim' }
];

export const DAILY_QUESTS_DEF = [
  { id: 'q_play1', title: 'Pemanasan Dulu', desc: 'Mainkan 1 game apa saja', target: 1, statKey: 'gamesPlayed', xp: 30, psc: 5 },
  { id: 'q_play3', title: 'Keliling Arena', desc: 'Mainkan 3 sesi game hari ini', target: 3, statKey: 'gamesPlayed', xp: 60, psc: 10 },
  { id: 'q_trivia5', title: 'Otak Masih Nyala', desc: 'Jawab 5 soal trivia dengan benar', target: 5, statKey: 'triviaCorrect', xp: 50, psc: 8 },
  { id: 'q_collect1', title: 'Kolektor Dadakan', desc: 'Dapatkan 1 ikan atau item koleksi', target: 1, statKey: 'itemsGot', xp: 45, psc: 7 }
];

export function getAuthUser(req, res) {
  const raw = req.user || req.tgUser || res.locals?.user;
  if (!raw || !raw.id) return null;
  return db.prepare('SELECT * FROM users WHERE id = ?').get(String(raw.id));
}

export function weightedPick(pool) {
  const total = pool.reduce((acc, item) => acc + item.chance, 0);
  let r = Math.random() * total;
  for (const item of pool) {
    if (r < item.chance) return item;
    r -= item.chance;
  }
  return pool[0];
}

export function calcLevelFromXp(xp) {
  return Math.max(1, Math.floor((Number(xp) || 0) / 150) + 1);
}

export function getOrCreateArcadeProfile(userId) {
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

export function clampDailyPsc(userId, desiredPsc) {
  const want = Math.max(0, Math.round(Number(desiredPsc) || 0));
  if (want <= 0) return { awarded: 0, capped: false, remaining: 0 };
  const prof = getOrCreateArcadeProfile(userId);
  const earnedSoFar = Number(prof.dailyStats.pscEarnedToday || 0);
  const remaining = Math.max(0, DAILY_PSC_CAP - earnedSoFar);
  const awarded = Math.min(want, remaining);
  return { awarded, capped: awarded < want, remaining: Math.max(0, remaining - awarded) };
}

export function updateArcadeProgress(userId, { addXp = 0, statsInc = {}, newBest = null }) {
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

export function getLeaderboards() {
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
