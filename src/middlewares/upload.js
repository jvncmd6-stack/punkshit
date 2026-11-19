import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { ENV } from '../config/env.js';

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export const uploadMem = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 }, // Maksimal 3MB
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      return cb(new Error('Format file harus JPG, PNG, WEBP, atau GIF.'));
    }
    cb(null, true);
  }
});

// Simpan file ke folder uploads/<subFolder> dan kembalikan path publik (/uploads/...)
export async function processAndSaveImage(file, subFolder, options = {}) {
  if (!file || !file.buffer) throw new Error('File gambar tidak ditemukan.');

  const id = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const isGif = file.mimetype === 'image/gif';

  // Jika GIF animasi, simpan langsung agar animasinya tetap jalan
  if (isGif) {
    const filename = `${id}.gif`;
    const fullPath = path.join(ENV.UPLOAD_DIR, subFolder, filename);
    await fs.promises.writeFile(fullPath, file.buffer);
    return `/uploads/${subFolder}/${filename}`;
  }

  // Untuk PNG/WEBP/JPG, optimalkan ukuran dengan sharp sambil menjaga transparansi
  const isTransparent = file.mimetype === 'image/png' || file.mimetype === 'image/webp';
  const ext = isTransparent ? 'webp' : 'jpg';
  const filename = `${id}.${ext}`;
  const fullPath = path.join(ENV.UPLOAD_DIR, subFolder, filename);

  let pipeline = sharp(file.buffer).rotate();
  if (options.width || options.height) {
    pipeline = pipeline.resize(options.width, options.height, {
      fit: options.fit || 'inside',
      withoutEnlargement: true
    });
  }

  if (isTransparent) {
    await pipeline.webp({ quality: 86, alphaQuality: 100 }).toFile(fullPath);
  } else {
    await pipeline.jpeg({ quality: 84 }).toFile(fullPath);
  }

  return `/uploads/${subFolder}/${filename}`;
}
