import { Bot } from 'grammy';
import { ENV } from '../config/env.js';
import { db } from '../database/db.js';
import { bindBotInstance } from '../services/syncEngine.js';
import { registerBotHandlers } from './handlers.js';
import { registerLapakCommands } from './lapakCommands.js';
import { registerSparkAdminSync } from './sparkAdminSync.js';

let botInstance = null;

db.exec(`
  CREATE TABLE IF NOT EXISTS bot_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS radio_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    source_type TEXT DEFAULT 'spotify',
    song TEXT NOT NULL,
    link TEXT DEFAULT '',
    file_id TEXT DEFAULT '',
    message TEXT DEFAULT '',
    status TEXT DEFAULT 'waiting',
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id TEXT NOT NULL,
    action TEXT NOT NULL,
    detail TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS spark_pairs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user1 TEXT NOT NULL,
    user2 TEXT NOT NULL,
    status TEXT NOT NULL,
    streak INTEGER DEFAULT 0,
    xp INTEGER DEFAULT 0,
    last_qualified_date TEXT DEFAULT '',
    case_status TEXT DEFAULT 'OPEN',
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS spark_daily (
    date TEXT NOT NULL,
    username TEXT NOT NULL,
    gap INTEGER DEFAULT 0,
    msg INTEGER DEFAULT 0,
    last_msg_ts INTEGER DEFAULT 0,
    PRIMARY KEY (date, username)
  );
  CREATE TABLE IF NOT EXISTS psc_requests (
    id TEXT PRIMARY KEY,
    requester_id TEXT NOT NULL,
    requester_name TEXT NOT NULL,
    target_id TEXT NOT NULL,
    target_name TEXT NOT NULL,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL
  );
`);

try { db.exec("ALTER TABLE radio_queue ADD COLUMN source_type TEXT DEFAULT 'spotify'"); } catch (e) {}
try { db.exec("ALTER TABLE radio_queue ADD COLUMN file_id TEXT DEFAULT ''"); } catch (e) {}
try { db.exec("ALTER TABLE spark_pairs ADD COLUMN case_status TEXT DEFAULT 'OPEN'"); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN is_frozen INTEGER DEFAULT 0'); } catch (e) {}

export function startBot() {
  if (!ENV.BOT_TOKEN) {
    console.warn('[PUNKSHIT.OS] BOT_TOKEN kosong, bot dilewati.');
    return null;
  }

  const bot = new Bot(ENV.BOT_TOKEN);
  botInstance = bot;
  bindBotInstance(bot);

  bot.api.setMyCommands([
    { command: 'start', description: 'Menu Utama Markas PUNKSHIT.OS' },
    { command: 'flex', description: 'Pamer Kartu & Gelar PunkID di Grup' },
    { command: 'item', description: 'Pamer Item Rongsok / Lapak Warga (/item nama)' },
    { command: 'tutor', description: 'Panduan Cara Pakai Semua App Mini App' },
    { command: 'spark', description: 'Buka Spark Buddies' },
    { command: 'setor', description: 'Setor Harian Api Spark (1x Sehari)' },
    { command: 'acc', description: 'Terima Ajakan Spark Buddies' },
    { command: 'cekpsc', description: 'Cek Saldo PSC & Gelar Warga' },
    { command: 'antrean', description: 'Cek Antrean Lagu Radio Gang' },
    { command: 'req', description: 'Titip Lagu Spotify (/req Judul | Link)' },
    { command: 'pasal', description: 'Pasal & Aturan Tongkrongan' },
    { command: 'help', description: 'Pusat Bantuan Warga' },
    { command: 'kamus', description: 'Kamus Command Warga' },
    { command: 'myid', description: 'Cek Telegram ID Kamu' }
  ]).catch(() => {});

  registerLapakCommands(bot);
  registerSparkAdminSync(bot);
  registerBotHandlers(bot);

  bot.catch((err) => {
    console.error('[Bot Error]:', err.message);
  });

  bot.start({
    drop_pending_updates: true,
    onStart: () => console.log('[PUNKSHIT.OS] Bot Mas Raka aktif.')
  });

  return bot;
}

export function getBotInstance() {
  return botInstance;
}

export default startBot;
