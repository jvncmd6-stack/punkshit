import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { ENV } from './src/config/env.js';
import { initDb } from './src/database/db.js';
import { authTma } from './src/middlewares/authTma.js';
import { userRouter } from './src/api/userRoutes.js';
import { actionRouter } from './src/api/actionRoutes.js';
import { gameRouter } from './src/api/gameRoutes.js';
import { socialRouter } from './src/api/socialRoutes.js';
import * as botMod from './src/bot/index.js';

// Pastikan folder data & uploads tersedia di Volume Railway
fs.mkdirSync(ENV.DATA_DIR, { recursive: true });
fs.mkdirSync(ENV.UPLOAD_DIR, { recursive: true });

// Inisialisasi tabel SQLite
initDb();

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static(ENV.UPLOAD_DIR));

// Health check endpoint untuk Railway
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'PUNKSHIT.OS API', time: Date.now() });
});

// Middleware autentikasi Telegram WebApp untuk seluruh endpoint /api
app.use('/api', authTma);
app.use('/api', userRouter);
app.use('/api', actionRouter);
app.use('/api', gameRouter);
app.use('/api', socialRouter);

// Muat adminRoutes.js secara opsional jika file tersebut ada di repo
if (fs.existsSync(path.resolve('./src/api/adminRoutes.js'))) {
  const adminMod = await import('./src/api/adminRoutes.js');
  const adminRouter = adminMod.adminRouter || adminMod.default;
  if (adminRouter) app.use('/api', adminRouter);
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('[API Error]:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = Number(process.env.PORT) || ENV.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[PUNKSHIT.OS] API berjalan di port ${PORT}`);
  const runBot = botMod.startBot || botMod.initBot || botMod.launchBot || botMod.default;
  if (typeof runBot === 'function') {
    runBot();
  }
});
