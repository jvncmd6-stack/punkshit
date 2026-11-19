import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { ENV } from '../config/env.js';

const uploadDir = ENV.UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads');

// Pastikan folder utama & semua subfolder wajib otomatis dibuat saat server jalan
['memes', 'shop', 'avatars'].forEach((sub) => {
  const fullPath = path.join(uploadDir, sub);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

const storage = multer.memoryStorage();

export const uploadMem = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Maksimal 10MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/webm',
      'application/octet-stream'
    ];
    if (allowedMimes.includes(file.mimetype) || /\.(jpg|jpeg|png|webp|gif|webm)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Format file kaga didukung cuy. Pake JPG, PNG, WEBP, GIF, atau WEBM.'), false);
    }
  }
});

export async function processAndSaveImage(
  file,
  subfolder = 'memes',
  options = { width: 1080, height: 1080, fit: 'inside' }
) {
  const targetFolder = path.join(uploadDir, subfolder);
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder, { recursive: true });
  }

  const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
  const filepath = path.join(targetFolder, filename);

  const isAnimated =
    file.mimetype === 'video/webm' ||
    file.mimetype === 'image/gif' ||
    ext === '.webm' ||
    ext === '.gif';

  if (isAnimated) {
    fs.writeFileSync(filepath, file.buffer);
  } else {
    try {
      await sharp(file.buffer)
        .resize(options.width, options.height, {
          fit: options.fit,
          withoutEnlargement: true
        })
        .toFile(filepath);
    } catch (err) {
      fs.writeFileSync(filepath, file.buffer);
    }
  }

  return `/uploads/${subfolder}/${filename}`;
}
