import Database from 'better-sqlite3';
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

  // Seed 5 Gift bawaan & 2 Card Skin jika tabel items masih kosong
  const count = db.prepare('SELECT COUNT(*) AS c FROM items').get().c;
  if (count === 0) {
    const ins = db.prepare(`
      INSERT INTO items (id, type, name, price, rarity, stock, desc, colors, svg_path, skin_class, created_at)
      VALUES (@id, @type, @name, @price, @rarity, -1, @desc, @colors, @svg_path, @skin_class, @created_at)
    `);
    const now = Date.now();
    const defaults = [
      { id: 'heart', type: 'gift', name: 'Chrome Heart', price: 50, rarity: 'Rare', desc: 'Hati krom buat yang spesial.', colors: JSON.stringify(['#cfeaff', '#176BFF']), svg_path: 'M50 88C18 64 8 46 8 33a21 21 0 0142-5 21 21 0 0142 5c0 13-10 31-42 55z', skin_class: '', created_at: now },
      { id: 'bolt', type: 'gift', name: 'Neon Bolt', price: 80, rarity: 'Rare', desc: 'Kilat buat yang selalu on fire.', colors: JSON.stringify(['#fff7a0', '#ffb800']), svg_path: 'M60 4L18 56h27l-7 40 44-56H55z', skin_class: '', created_at: now },
      { id: 'star', type: 'gift', name: 'Punk Star', price: 120, rarity: 'Epic', desc: 'Bintang jalanan, bersinar di gang.', colors: JSON.stringify(['#ffb3e6', '#9a3cff']), svg_path: 'M50 6l13 28 30 3-22 21 7 30-28-16-28 16 7-30L7 37l30-3z', skin_class: '', created_at: now },
      { id: 'fish', type: 'gift', name: 'Golden Punkfish', price: 300, rarity: 'Legendary', desc: 'Ikan emas langka. Main character luck.', colors: JSON.stringify(['#fff3b0', '#e09a00']), svg_path: 'M5 50C22 22 52 20 70 43l23-19v52L70 57C52 80 22 78 5 50z', skin_class: '', created_at: now },
      { id: 'crown', type: 'gift', name: 'Fosil Crown', price: 500, rarity: 'Legendary', desc: 'Mahkota buat fosil sejati markas.', colors: JSON.stringify(['#c8f7ff', '#1e8ab8']), svg_path: 'M8 80V28l24 24 18-34 18 34 24-24v52z', skin_class: '', created_at: now },
      { id: 'skin-chrome', type: 'skin', name: 'Chrome Edition Card', price: 200, rarity: 'Epic', desc: 'Lapisan metalik krom untuk kartu PunkID.', colors: JSON.stringify(['#e0e8f5', '#6c7a96']), svg_path: 'M15 25h70v50H15z', skin_class: 'skin-chrome', created_at: now },
      { id: 'skin-gold', type: 'skin', name: 'Sultan Gold Card', price: 450, rarity: 'Legendary', desc: 'Kartu emas khusus donatur & sepuh markas.', colors: JSON.stringify(['#ffe879', '#b87b00']), svg_path: 'M15 25h70v50H15z', skin_class: 'skin-gold', created_at: now }
    ];
    const tx = db.transaction(list => { for (const item of list) ins.run(item); });
    tx(defaults);
  }
}

export function addFeed(text) {
  db.prepare('INSERT INTO feed (text, created_at) VALUES (?, ?)').run(text, Date.now());
  db.prepare('DELETE FROM feed WHERE id NOT IN (SELECT id FROM feed ORDER BY id DESC LIMIT 20)').run();
}

export function addAuditLog(actorId, action, detail) {
  db.prepare('INSERT INTO audit_logs (actor_id, action, detail, created_at) VALUES (?, ?, ?, ?)')
    .run(String(actorId), action, detail, Date.now());
}
