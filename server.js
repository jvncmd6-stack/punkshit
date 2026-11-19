import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { ENV } from './src/config/env.js';
import { initDb } from './src/database/db.js';
import { apiRouter } from './src/api/routes.js';
import { initBot } from './src/bot/index.js';
import { startScheduler } from './src/jobs/scheduler.js';

// Pastikan folder penyimpanan permanen & sub-folder uploads tersedia
for (const sub of ['', 'banners', 'items', 'memes']) {
  const dir = sub ? `${ENV.UPLOAD_DIR}/${sub}` : ENV.UPLOAD_DIR;
  fs.mkdirSync(dir, { recursive: true });
}

// Inisialisasi Database SQLite & seed katalog bawaan
initDb();

const app = express();
const ORIGIN = new URL(ENV.WEBAPP_URL).origin;

app.use(cors({ origin: ORIGIN }));
app.use(express.json({ limit: '50kb' }));

// Sajikan file gambar (Banner Profil, Border Discord, Gift, Meme) secara publik
app.use('/uploads', express.static(ENV.UPLOAD_DIR, { maxAge: '7d' }));

// Healthcheck endpoint
app.get('/', (_req, res) => {
  res.json({ status: 'online', service: 'PUNKSHIT.OS Core v3.0' });
});

// Daftarkan seluruh REST API untuk Mini App
app.use('/api', apiRouter);

// Jalankan server HTTP, Bot Mas Raka, dan Cron Scheduler
app.listen(ENV.PORT, '0.0.0.0', () => {
  console.log(`[PUNKSHIT.OS] API berjalan di port ${ENV.PORT}`);
});

const bot = initBot();
startScheduler(bot);
