import Database from 'better-sqlite3';
import { ENV } from '../config/env.js';

export const db = new Database(ENV.DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function safeAddColumn(table, colDef) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${colDef}`);
  } catch (_) {
    // Abaikan jika kolom sudah ada
  }
}

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT DEFAULT '',
      name TEXT NOT NULL,
      member_no TEXT NOT NULL,
      photo_url TEXT DEFAULT '',
      banner_url TEXT DEFAULT '',
      bio TEXT DEFAULT '',
      spotify_url TEXT DEFAULT '',
      birthday TEXT DEFAULT '',
      role TEXT DEFAULT 'member',
      psc INTEGER DEFAULT 110,
      streak INTEGER DEFAULT 0,
      best INTEGER DEFAULT 0,
      cred INTEGER DEFAULT 0,
      last_absen TEXT DEFAULT '',
      presence TEXT DEFAULT '☕ Nongki Dulu',
      presence_at INTEGER DEFAULT 0,
      ring_style INTEGER DEFAULT 1,
      equipped_border_id TEXT DEFAULT '',
      equipped_skin_id TEXT DEFAULT '',
      pinned_gift_id TEXT DEFAULT '',
      fish_today INTEGER DEFAULT 0,
      fish_date TEXT DEFAULT '',
      fish_count INTEGER DEFAULT 0,
      scratched_date TEXT DEFAULT '',
      has_shared INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      rarity TEXT DEFAULT 'Rare',
      stock INTEGER DEFAULT -1,
      desc TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      colors TEXT DEFAULT '',
      svg_path TEXT DEFAULT '',
      skin_class TEXT DEFAULT '',
      creator_id TEXT DEFAULT '',
      creator_name TEXT DEFAULT '',
      is_collab INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS item_submissions (
      id TEXT PRIMARY KEY,
      creator_id TEXT NOT NULL,
      creator_name TEXT NOT NULL,
      creator_username TEXT DEFAULT '',
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      desc TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      reviewed_by TEXT DEFAULT '',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS warga_shop_items (
      id TEXT PRIMARY KEY,
      seller_id TEXT NOT NULL,
      seller_name TEXT NOT NULL,
      seller_username TEXT DEFAULT '',
      category TEXT DEFAULT 'Barang',
      title TEXT NOT NULL,
      price INTEGER NOT NULL,
      stock INTEGER DEFAULT 1,
      sold_count INTEGER DEFAULT 0,
      description TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      status TEXT DEFAULT 'open',
      buyer_name TEXT DEFAULT '',
      boosted_until INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS warga_shop_orders (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      item_title TEXT NOT NULL,
      seller_id TEXT NOT NULL,
      seller_name TEXT NOT NULL,
      buyer_id TEXT NOT NULL,
      buyer_name TEXT NOT NULL,
      price INTEGER NOT NULL,
      note TEXT DEFAULT '',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      acquired_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      note TEXT DEFAULT '',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS saweran (
      id TEXT PRIMARY KEY,
      creator_id TEXT NOT NULL,
      creator_name TEXT NOT NULL,
      total_amount INTEGER NOT NULL,
      remaining_amount INTEGER NOT NULL,
      quota INTEGER NOT NULL,
      mode TEXT DEFAULT 'equal',
      message TEXT DEFAULT '',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS saweran_claims (
      saweran_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      claimed_at INTEGER NOT NULL,
      PRIMARY KEY (saweran_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS mission_claims (
      user_id TEXT NOT NULL,
      mission_id TEXT NOT NULL,
      period_key TEXT NOT NULL,
      claimed_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, mission_id, period_key)
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      type TEXT DEFAULT 'EVENT',
      title TEXT NOT NULL,
      date_text TEXT NOT NULL,
      description TEXT DEFAULT '',
      reward_text TEXT DEFAULT 'PSC & Street Cred',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS event_rsvps (
      event_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      joined_at INTEGER NOT NULL,
      PRIMARY KEY (event_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS wanted (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      category TEXT NOT NULL,
      slots INTEGER NOT NULL,
      note TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wanted_joins (
      wanted_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      joined_at INTEGER NOT NULL,
      PRIMARY KEY (wanted_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS menfess (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      category TEXT NOT NULL,
      text TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS polls (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      options_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS poll_votes (
      poll_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      option_index INTEGER NOT NULL,
      PRIMARY KEY (poll_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS capsules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      unlock_date TEXT NOT NULL,
      message TEXT NOT NULL,
      opened INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS feed (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_id TEXT NOT NULL,
      action TEXT NOT NULL,
      detail TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  // Migrasi aman untuk database lama agar kolom baru otomatis tersedia
  safeAddColumn('items', "creator_id TEXT DEFAULT ''");
  safeAddColumn('items', "creator_name TEXT DEFAULT ''");
  safeAddColumn('items', 'is_collab INTEGER DEFAULT 0');
  safeAddColumn('warga_shop_items', 'stock INTEGER DEFAULT 1');
  safeAddColumn('warga_shop_items', 'sold_count INTEGER DEFAULT 0');
  safeAddColumn('warga_shop_items', 'boosted_until INTEGER DEFAULT 0');

  const ins = db.prepare(`
    INSERT OR IGNORE INTO items (id, type, name, price, rarity, stock, desc, colors, svg_path, skin_class, created_at)
    VALUES (@id, @type, @name, @price, @rarity, -1, @desc, @colors, @svg_path, @skin_class, @created_at)
  `);
  const now = Date.now();
  const ringSvg = 'M50 4a46 46 0 100 92 46 46 0 000-92zm0 13a33 33 0 110 66 33 33 0 010-66z';

  const defaults = [
    { id: 'heart', type: 'gift', name: 'Chrome Heart', price: 50, rarity: 'Rare', desc: 'Hati krom buat yang spesial.', colors: JSON.stringify(['#cfeaff', '#176BFF']), svg_path: 'M50 88C18 64 8 46 8 33a21 21 0 0142-5 21 21 0 0142 5c0 13-10 31-42 55z', skin_class: '', created_at: now },
    { id: 'bolt', type: 'gift', name: 'Neon Bolt', price: 80, rarity: 'Rare', desc: 'Kilat buat yang selalu on fire.', colors: JSON.stringify(['#fff7a0', '#ffb800']), svg_path: 'M60 4L18 56h27l-7 40 44-56H55z', skin_class: '', created_at: now },
    { id: 'star', type: 'gift', name: 'Punk Star', price: 120, rarity: 'Epic', desc: 'Bintang jalanan, bersinar di gang.', colors: JSON.stringify(['#ffb3e6', '#9a3cff']), svg_path: 'M50 6l13 28 30 3-22 21 7 30-28-16-28 16 7-30L7 37l30-3z', skin_class: '', created_at: now },
    { id: 'fish', type: 'gift', name: 'Golden Punkfish', price: 300, rarity: 'Legendary', desc: 'Ikan emas langka. Main character luck.', colors: JSON.stringify(['#fff3b0', '#e09a00']), svg_path: 'M5 50C22 22 52 20 70 43l23-19v52L70 57C52 80 22 78 5 50z', skin_class: '', created_at: now },
    { id: 'crown', type: 'gift', name: 'Fosil Crown', price: 500, rarity: 'Legendary', desc: 'Mahkota buat fosil sejati markas.', colors: JSON.stringify(['#c8f7ff', '#1e8ab8']), svg_path: 'M8 80V28l24 24 18-34 18 34 24-24v52z', skin_class: '', created_at: now },
    { id: 'border-cyber', type: 'border', name: 'Cyber Blue Aura', price: 120, rarity: 'Rare', desc: 'Bingkai neon biru elektrik menyala di sekitar avatar.', colors: JSON.stringify(['#8FC7FF', '#176BFF']), svg_path: ringSvg, skin_class: 'border-cyber', created_at: now },
    { id: 'border-toxic', type: 'border', name: 'Toxic Slime Ring', price: 160, rarity: 'Rare', desc: 'Aura hijau radioaktif khas anak malam markas.', colors: JSON.stringify(['#9effa9', '#16a34a']), svg_path: ringSvg, skin_class: 'border-toxic', created_at: now },
    { id: 'border-crimson', type: 'border', name: 'Crimson Inferno', price: 220, rarity: 'Epic', desc: 'Cincin bara merah menyala buat yang lagi on fire.', colors: JSON.stringify(['#ff9e9e', '#dc2626']), svg_path: ringSvg, skin_class: 'border-crimson', created_at: now },
    { id: 'border-violet', type: 'border', name: 'Phantom Violet', price: 280, rarity: 'Epic', desc: 'Bingkai ungu mistis berputar untuk karakter misterius.', colors: JSON.stringify(['#e5b8ff', '#7c3aed']), svg_path: ringSvg, skin_class: 'border-violet', created_at: now },
    { id: 'border-gold', type: 'border', name: 'Solar Gold Halo', price: 420, rarity: 'Legendary', desc: 'Halo emas sultan dengan kilau mewah di foto profil.', colors: JSON.stringify(['#fff3a0', '#eab308']), svg_path: ringSvg, skin_class: 'border-gold', created_at: now },
    { id: 'skin-obsidian', type: 'skin', name: 'Midnight Obsidian Card', price: 150, rarity: 'Rare', desc: 'Lapisan hitam matte elegan dengan aksen karbon.', colors: JSON.stringify(['#475569', '#090d16']), svg_path: 'M15 25h70v50H15z', skin_class: 'skin-obsidian', created_at: now },
    { id: 'skin-chrome', type: 'skin', name: 'Chrome Edition Card', price: 200, rarity: 'Epic', desc: 'Lapisan metalik krom untuk kartu PunkID.', colors: JSON.stringify(['#e0e8f5', '#6c7a96']), svg_path: 'M15 25h70v50H15z', skin_class: 'skin-chrome', created_at: now },
    { id: 'skin-neon', type: 'skin', name: 'Cyber Neon Card', price: 260, rarity: 'Epic', desc: 'Kartu cyberpunk gradasi biru-ungu bercahaya.', colors: JSON.stringify(['#38bdf8', '#7e22ce']), svg_path: 'M15 25h70v50H15z', skin_class: 'skin-neon', created_at: now },
    { id: 'skin-crimson', type: 'skin', name: 'Blood Crimson Card', price: 320, rarity: 'Epic', desc: 'Kartu merah gelap berkarisma khusus pentolan gang.', colors: JSON.stringify(['#f87171', '#7f1d1d']), svg_path: 'M15 25h70v50H15z', skin_class: 'skin-crimson', created_at: now },
    { id: 'skin-gold', type: 'skin', name: 'Sultan Gold Card', price: 450, rarity: 'Legendary', desc: 'Kartu emas khusus donatur & sepuh markas.', colors: JSON.stringify(['#ffe879', '#b87b00']), svg_path: 'M15 25h70v50H15z', skin_class: 'skin-gold', created_at: now }
  ];

  const tx = db.transaction(list => { for (const item of list) ins.run(item); });
  tx(defaults);
}

export function addFeed(text) {
  db.prepare('INSERT INTO feed (text, created_at) VALUES (?, ?)').run(text, Date.now());
  db.prepare('DELETE FROM feed WHERE id NOT IN (SELECT id FROM feed ORDER BY id DESC LIMIT 20)').run();
}

export function addAuditLog(actorId, action, detail) {
  db.prepare('INSERT INTO audit_logs (actor_id, action, detail, created_at) VALUES (?, ?, ?, ?)')
    .run(String(actorId), action, detail, Date.now());
}import Database from 'better-sqlite3';
import { ENV } from '../config/env.js';

export const db = new Database(ENV.DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT DEFAULT '',
      name TEXT NOT NULL,
      member_no TEXT NOT NULL,
      photo_url TEXT DEFAULT '',
      banner_url TEXT DEFAULT '',
      bio TEXT DEFAULT '',
      spotify_url TEXT DEFAULT '',
      birthday TEXT DEFAULT '',
      role TEXT DEFAULT 'member',
      psc INTEGER DEFAULT 110,
      streak INTEGER DEFAULT 0,
      best INTEGER DEFAULT 0,
      cred INTEGER DEFAULT 0,
      last_absen TEXT DEFAULT '',
      presence TEXT DEFAULT '☕ Nongki Dulu',
      presence_at INTEGER DEFAULT 0,
      ring_style INTEGER DEFAULT 1,
      equipped_border_id TEXT DEFAULT '',
      equipped_skin_id TEXT DEFAULT '',
      pinned_gift_id TEXT DEFAULT '',
      fish_today INTEGER DEFAULT 0,
      fish_date TEXT DEFAULT '',
      fish_count INTEGER DEFAULT 0,
      scratched_date TEXT DEFAULT '',
      has_shared INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      rarity TEXT DEFAULT 'Rare',
      stock INTEGER DEFAULT -1,
      desc TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      colors TEXT DEFAULT '',
      svg_path TEXT DEFAULT '',
      skin_class TEXT DEFAULT '',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      acquired_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      note TEXT DEFAULT '',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS saweran (
      id TEXT PRIMARY KEY,
      creator_id TEXT NOT NULL,
      creator_name TEXT NOT NULL,
      total_amount INTEGER NOT NULL,
      remaining_amount INTEGER NOT NULL,
      quota INTEGER NOT NULL,
      mode TEXT DEFAULT 'equal',
      message TEXT DEFAULT '',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS saweran_claims (
      saweran_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      claimed_at INTEGER NOT NULL,
      PRIMARY KEY (saweran_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS mission_claims (
      user_id TEXT NOT NULL,
      mission_id TEXT NOT NULL,
      period_key TEXT NOT NULL,
      claimed_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, mission_id, period_key)
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      type TEXT DEFAULT 'EVENT',
      title TEXT NOT NULL,
      date_text TEXT NOT NULL,
      description TEXT DEFAULT '',
      reward_text TEXT DEFAULT 'PSC & Street Cred',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS event_rsvps (
      event_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      joined_at INTEGER NOT NULL,
      PRIMARY KEY (event_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS wanted (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      category TEXT NOT NULL,
      slots INTEGER NOT NULL,
      note TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wanted_joins (
      wanted_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      joined_at INTEGER NOT NULL,
      PRIMARY KEY (wanted_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS menfess (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      category TEXT NOT NULL,
      text TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS polls (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      options_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS poll_votes (
      poll_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      option_index INTEGER NOT NULL,
      PRIMARY KEY (poll_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS capsules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      unlock_date TEXT NOT NULL,
      message TEXT NOT NULL,
      opened INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS feed (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_id TEXT NOT NULL,
      action TEXT NOT NULL,
      detail TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  // Seed & tambahkan item bawaan (Gift, Avatar Border, & Card Skin) dengan INSERT OR IGNORE
  const ins = db.prepare(`
    INSERT OR IGNORE INTO items (id, type, name, price, rarity, stock, desc, colors, svg_path, skin_class, created_at)
    VALUES (@id, @type, @name, @price, @rarity, -1, @desc, @colors, @svg_path, @skin_class, @created_at)
  `);
  const now = Date.now();
  const ringSvg = 'M50 4a46 46 0 100 92 46 46 0 000-92zm0 13a33 33 0 110 66 33 33 0 010-66z';

  const defaults = [
    // 5 Gift Bawaan
    { id: 'heart', type: 'gift', name: 'Chrome Heart', price: 50, rarity: 'Rare', desc: 'Hati krom buat yang spesial.', colors: JSON.stringify(['#cfeaff', '#176BFF']), svg_path: 'M50 88C18 64 8 46 8 33a21 21 0 0142-5 21 21 0 0142 5c0 13-10 31-42 55z', skin_class: '', created_at: now },
    { id: 'bolt', type: 'gift', name: 'Neon Bolt', price: 80, rarity: 'Rare', desc: 'Kilat buat yang selalu on fire.', colors: JSON.stringify(['#fff7a0', '#ffb800']), svg_path: 'M60 4L18 56h27l-7 40 44-56H55z', skin_class: '', created_at: now },
    { id: 'star', type: 'gift', name: 'Punk Star', price: 120, rarity: 'Epic', desc: 'Bintang jalanan, bersinar di gang.', colors: JSON.stringify(['#ffb3e6', '#9a3cff']), svg_path: 'M50 6l13 28 30 3-22 21 7 30-28-16-28 16 7-30L7 37l30-3z', skin_class: '', created_at: now },
    { id: 'fish', type: 'gift', name: 'Golden Punkfish', price: 300, rarity: 'Legendary', desc: 'Ikan emas langka. Main character luck.', colors: JSON.stringify(['#fff3b0', '#e09a00']), svg_path: 'M5 50C22 22 52 20 70 43l23-19v52L70 57C52 80 22 78 5 50z', skin_class: '', created_at: now },
    { id: 'crown', type: 'gift', name: 'Fosil Crown', price: 500, rarity: 'Legendary', desc: 'Mahkota buat fosil sejati markas.', colors: JSON.stringify(['#c8f7ff', '#1e8ab8']), svg_path: 'M8 80V28l24 24 18-34 18 34 24-24v52z', skin_class: '', created_at: now },

    // 5 Avatar Border (Bisa dipasang & dilepas di profil avatar)
    { id: 'border-cyber', type: 'border', name: 'Cyber Blue Aura', price: 120, rarity: 'Rare', desc: 'Bingkai neon biru elektrik menyala di sekitar avatar.', colors: JSON.stringify(['#8FC7FF', '#176BFF']), svg_path: ringSvg, skin_class: 'border-cyber', created_at: now },
    { id: 'border-toxic', type: 'border', name: 'Toxic Slime Ring', price: 160, rarity: 'Rare', desc: 'Aura hijau radioaktif khas anak malam markas.', colors: JSON.stringify(['#9effa9', '#16a34a']), svg_path: ringSvg, skin_class: 'border-toxic', created_at: now },
    { id: 'border-crimson', type: 'border', name: 'Crimson Inferno', price: 220, rarity: 'Epic', desc: 'Cincin bara merah menyala buat yang lagi on fire.', colors: JSON.stringify(['#ff9e9e', '#dc2626']), svg_path: ringSvg, skin_class: 'border-crimson', created_at: now },
    { id: 'border-violet', type: 'border', name: 'Phantom Violet', price: 280, rarity: 'Epic', desc: 'Bingkai ungu mistis berputar untuk karakter misterius.', colors: JSON.stringify(['#e5b8ff', '#7c3aed']), svg_path: ringSvg, skin_class: 'border-violet', created_at: now },
    { id: 'border-gold', type: 'border', name: 'Solar Gold Halo', price: 420, rarity: 'Legendary', desc: 'Halo emas sultan dengan kilau mewah di foto profil.', colors: JSON.stringify(['#fff3a0', '#eab308']), svg_path: ringSvg, skin_class: 'border-gold', created_at: now },

    // 5 Card Skin (Bisa dipasang & dilepas di kartu PunkID)
    { id: 'skin-obsidian', type: 'skin', name: 'Midnight Obsidian Card', price: 150, rarity: 'Rare', desc: 'Lapisan hitam matte elegan dengan aksen karbon.', colors: JSON.stringify(['#475569', '#090d16']), svg_path: 'M15 25h70v50H15z', skin_class: 'skin-obsidian', created_at: now },
    { id: 'skin-chrome', type: 'skin', name: 'Chrome Edition Card', price: 200, rarity: 'Epic', desc: 'Lapisan metalik krom untuk kartu PunkID.', colors: JSON.stringify(['#e0e8f5', '#6c7a96']), svg_path: 'M15 25h70v50H15z', skin_class: 'skin-chrome', created_at: now },
    { id: 'skin-neon', type: 'skin', name: 'Cyber Neon Card', price: 260, rarity: 'Epic', desc: 'Kartu cyberpunk gradasi biru-ungu bercahaya.', colors: JSON.stringify(['#38bdf8', '#7e22ce']), svg_path: 'M15 25h70v50H15z', skin_class: 'skin-neon', created_at: now },
    { id: 'skin-crimson', type: 'skin', name: 'Blood Crimson Card', price: 320, rarity: 'Epic', desc: 'Kartu merah gelap berkarisma khusus pentolan gang.', colors: JSON.stringify(['#f87171', '#7f1d1d']), svg_path: 'M15 25h70v50H15z', skin_class: 'skin-crimson', created_at: now },
    { id: 'skin-gold', type: 'skin', name: 'Sultan Gold Card', price: 450, rarity: 'Legendary', desc: 'Kartu emas khusus donatur & sepuh markas.', colors: JSON.stringify(['#ffe879', '#b87b00']), svg_path: 'M15 25h70v50H15z', skin_class: 'skin-gold', created_at: now }
  ];

  const tx = db.transaction(list => { for (const item of list) ins.run(item); });
  tx(defaults);
}

export function addFeed(text) {
  db.prepare('INSERT INTO feed (text, created_at) VALUES (?, ?)').run(text, Date.now());
  db.prepare('DELETE FROM feed WHERE id NOT IN (SELECT id FROM feed ORDER BY id DESC LIMIT 20)').run();
}

export function addAuditLog(actorId, action, detail) {
  db.prepare('INSERT INTO audit_logs (actor_id, action, detail, created_at) VALUES (?, ?, ?, ?)')
    .run(String(actorId), action, detail, Date.now());
}
