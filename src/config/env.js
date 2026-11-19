import 'dotenv/config';
import path from 'path';

const REQUIRED = ['BOT_TOKEN', 'GROUP_ID', 'CHANNEL_ID', 'WEBAPP_URL', 'MINIAPP_LINK'];

for (const key of REQUIRED) {
  if (!process.env[key]) {
    console.error(`[FATAL] Environment variable kurang: ${key}`);
    process.exit(1);
  }
}

const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');

export const ENV = {
  PORT: Number(process.env.PORT) || 3000,
  BOT_TOKEN: process.env.BOT_TOKEN.trim(),
  GROUP_ID: process.env.GROUP_ID.trim(),
  CHANNEL_ID: process.env.CHANNEL_ID.trim(),
  WEBAPP_URL: process.env.WEBAPP_URL.trim(),
  MINIAPP_LINK: process.env.MINIAPP_LINK.trim(),
  OWNER_IDS: (process.env.OWNER_IDS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
  DATA_DIR,
  DB_PATH: path.join(DATA_DIR, 'punkshit.db'),
  UPLOAD_DIR: path.join(DATA_DIR, 'uploads')
};
