import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { ENV } from '../config/env.js';

// Pastikan folder direktori upload utama & subfolder wajib tersedia
const uploadDir = ENV.UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads');
['memes', 'shop', 'avatars'].forEach(sub => {
  const p = path.join(uploadDir, sub);
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
});

const storage = multer.memoryStorage();

export const uploadMem = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Max 10MB (support gambar, webm, gif)
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/webm', 'application/octet-stream'];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(jpg|jpeg|png|webp|gif|webm)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Format file kaga didukung, bro! Pake gambar, gif, atau webm.'), false);
    }
  }
});

export async function processAndSaveImage(file, subfolder = 'memes', options = { width: 1080, height: 1080, fit: 'inside' }) {
  const targetFolder = path.join(uploadDir, subfolder);
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder, { recursive: true });
  }

  const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${path.extname(file.originalname) || '.jpg'}`;
  const filepath = path.join(targetFolder, filename);

  // Jika format webm atau gif besar, simpan langsung tanpa sharp resize jika error
  if (file.mimetype === 'video/webm' || file.mimetype === 'image/gif' || file.originalname.endsWith('.webm') || file.originalname.endsWith('.gif')) {
    fs.writeFileSync(filepath, file.buffer);
  } else {
    try {
      await sharp(file.buffer)
        .resize(options.width, options.height, { fit: options.fit, withoutEnlargement: true })
        .toFile(filepath);
    } catch (e) {
      fs.writeFileSync(filepath, file.buffer);
    }
  }

  return `/uploads/${subfolder}/${filename}`;
}
