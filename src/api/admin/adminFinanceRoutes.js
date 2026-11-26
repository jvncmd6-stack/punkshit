import { Router } from 'express';
import crypto from 'crypto';
import { execSync } from 'child_process';
import fs from 'fs';
import multer from 'multer';
import { db } from '../../database/db.js';
import { ENV } from '../../config/env.js';
import { requireUser } from '../../middlewares/authTma.js';
import { escHtml } from '../../services/syncEngine.js';
import { isAdminUser, isOwnerUser, isOwnerOnly, logAudit } from './adminHelpers.js';

export const adminFinanceRouter = Router();
const uploadRestore = multer({ dest: '/tmp' });

adminFinanceRouter.post('/admin/economy/request', requireUser, (req, res) => {
  if (!isAdminUser(req.dbUser)) return res.status(403).json({ error: 'Akses ditolak.' });

  const rawTarget = String(req.body?.target || '').trim().replace(/^@/, '');
  const amount = Math.floor(Number(req.body?.amount) || 0);
  const reason = String(req.body?.reason || '').trim().slice(0, 120);

  if (!rawTarget || amount < 1 || amount > 5000 || reason.length < 3) {
    return res.status(400).json({ error: 'Target, nominal (1-5000 PSC), dan alasan wajib diisi.' });
  }

  const targetUser = db.prepare('SELECT * FROM users WHERE id = ? OR LOWER(username) = LOWER(?)').get(rawTarget, rawTarget);
  if (!targetUser) return res.status(404).json({ error: 'Warga penerima tidak ditemukan.' });

  const reqId = 'req_' + crypto.randomBytes(4).toString('hex');
  db.prepare(`
    INSERT INTO psc_requests (id, requester_id, requester_name, target_id, target_name, amount, reason, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `).run(reqId, String(req.dbUser.id), req.dbUser.name, String(targetUser.id), targetUser.name, amount, reason, Date.now());

  logAudit(req.dbUser.id, 'AJUKAN PSC', `${req.dbUser.name} mengajukan ${amount} PSC untuk ${targetUser.name} (${reason})`);
  res.json({ ok: true });
});

adminFinanceRouter.post('/admin/economy/review', requireUser, (req, res) => {
  if (!isOwnerUser(req.dbUser)) {
    return res.status(403).json({ error: 'Hanya Owner Markas yang berhak memberi izin pencairan PSC.' });
  }

  const id = String(req.body?.id || '');
  const decision = String(req.body?.decision || 'reject');
  const item = db.prepare("SELECT * FROM psc_requests WHERE id = ? AND status = 'pending'").get(id);
  if (!item) return res.status(404).json({ error: 'Pengajuan sudah diproses atau tidak ditemukan.' });

  if (decision === 'approve') {
    db.prepare('UPDATE users SET psc = MAX(0, psc + ?) WHERE id = ?').run(item.amount, item.target_id);
    db.prepare("UPDATE psc_requests SET status = 'approved' WHERE id = ?").run(id);
    logAudit(req.dbUser.id, 'IZIN PSC DISETUJUI', `+${item.amount} PSC ke ${item.target_name} (ajuan ${item.requester_name})`);
  } else {
    db.prepare("UPDATE psc_requests SET status = 'rejected' WHERE id = ?").run(id);
    logAudit(req.dbUser.id, 'IZIN PSC DITOLAK', `Tolak ${item.amount} PSC untuk ${item.target_name}`);
  }

  res.json({ ok: true });
});

adminFinanceRouter.post('/admin/economy/adjust', requireUser, (req, res) => {
  if (!isOwnerUser(req.dbUser)) {
    return res.status(403).json({ error: 'Akses ditolak. Eksekusi langsung PSC hanya untuk Owner!' });
  }

  const rawTarget = String(req.body?.target || '').trim().replace(/^@/, '');
  const amount = Number(req.body?.amount);
  const reason = String(req.body?.reason || 'Penyesuaian Owner').trim();

  if (!rawTarget || !amount || Number.isNaN(amount)) {
    return res.status(400).json({ error: 'Target warga dan nominal PSC wajib valid.' });
  }

  const targetUser = db.prepare('SELECT * FROM users WHERE id = ? OR LOWER(username) = LOWER(?)').get(rawTarget, rawTarget);
  if (!targetUser) return res.status(404).json({ error: 'Warga tidak ditemukan di database.' });

  db.prepare('UPDATE users SET psc = MAX(0, psc + ?) WHERE id = ?').run(amount, targetUser.id);
  logAudit(req.dbUser.id, 'OWNER PSC', `${amount > 0 ? '+' : ''}${amount} PSC ke ${targetUser.name} (${reason})`);

  res.json({ ok: true });
});

adminFinanceRouter.post('/admin/roles', requireUser, (req, res) => {
  if (!isOwnerUser(req.dbUser)) {
    return res.status(403).json({ error: 'Akses ditolak. Pengaturan role hanya untuk Owner!' });
  }

  const rawTarget = String(req.body?.target || '').trim().replace(/^@/, '');
  const role = String(req.body?.role || 'member').trim().toLowerCase();
  if (!['member', 'moderator', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Role tidak valid.' });
  }

  const targetUser = db.prepare('SELECT * FROM users WHERE id = ? OR LOWER(username) = LOWER(?)').get(rawTarget, rawTarget);
  if (!targetUser) return res.status(404).json({ error: 'Warga tidak ditemukan.' });

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, targetUser.id);
  logAudit(req.dbUser.id, 'SET ROLE', `${targetUser.name} -> ${role}`);

  res.json({ ok: true });
});

adminFinanceRouter.get('/admin/backup', (req, res) => {
  if (!isOwnerOnly(req)) {
    return res.status(403).json({ error: 'Akses ditolak. Khusus Owner Markas!' });
  }

  try {
    try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch (_) {}

    const tmpFile = `/tmp/punkshit_backup_${Date.now()}.tar.gz`;
    execSync(`tar -czf "${tmpFile}" -C "${ENV.DATA_DIR}" .`);

    const filename = `punkshit_backup_${new Date().toISOString().slice(0, 10)}.tar.gz`;
    res.download(tmpFile, filename, () => {
      try { fs.unlinkSync(tmpFile); } catch (_) {}
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal membuat arsip backup: ' + err.message });
  }
});

adminFinanceRouter.get('/admin/restore-ui', (req, res) => {
  if (!isOwnerOnly(req)) {
    return res.status(403).send('Akses ditolak. Khusus Owner Markas!');
  }

  const ownerId = escHtml(String(req.query.ownerId || ''));
  res.send(`<!doctype html>
  <html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Restore Database PUNKSHIT.OS</title>
  <style>
    body{font-family:system-ui,sans-serif;background:#0b0f19;color:#f8fafc;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px}
    .box{background:#111827;border:1px solid #334155;border-radius:16px;padding:24px;max-width:400px;width:100%}
    h2{margin:0 0 8px;font-size:18px;color:#38bdf8}
    p{font-size:13px;color:#94a3b8;line-height:1.5;margin:0 0 16px}
    input[type=file]{width:100%;margin-bottom:14px;color:#cbd5e1}
    button{width:100%;padding:12px;border:none;border-radius:10px;background:#2563eb;color:#fff;font-weight:700;font-size:14px;cursor:pointer}
    #msg{margin-top:12px;font-size:13px;color:#facc15}
  </style></head><body>
  <div class="box">
    <h2>Restore Data PUNKSHIT.OS</h2>
    <p>Pilih file <b>punkshit_backup_YYYY-MM-DD.tar.gz</b> dari server lama. Server akan otomatis restart setelah selesai.</p>
    <input type="file" id="f" accept=".gz,.tar.gz,application/gzip">
    <button onclick="go()">UPLOAD & RESTORE SEKARANG</button>
    <div id="msg"></div>
  </div>
  <script>
    async function go(){
      const file = document.getElementById('f').files[0];
      const msg = document.getElementById('msg');
      if(!file){ msg.textContent = 'Pilih file .tar.gz dulu!'; return; }
      msg.textContent = 'Mengupload & mengekstrak data...';
      const fd = new FormData();
      fd.append('backup', file);
      try {
        const r = await fetch('/api/admin/restore?ownerId=${ownerId}', { method: 'POST', body: fd });
        const d = await r.json();
        msg.textContent = d.message || d.error || 'Selesai!';
      } catch(e){ msg.textContent = 'Error: ' + e.message; }
    }
  </script></body></html>`);
});

adminFinanceRouter.post('/admin/restore', uploadRestore.single('backup'), (req, res) => {
  if (!isOwnerOnly(req)) {
    return res.status(403).json({ error: 'Akses ditolak. Khusus Owner Markas!' });
  }

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File backup (.tar.gz) belum dipilih.' });
    }

    execSync(`tar -xzf "${req.file.path}" -C "${ENV.DATA_DIR}"`);
    try { fs.unlinkSync(req.file.path); } catch (_) {}

    res.json({
      ok: true,
      message: 'Restore berhasil! Server restart otomatis dalam 2 detik...'
    });

    setTimeout(() => process.exit(0), 2000);
  } catch (err) {
    res.status(500).json({ error: 'Gagal restore: ' + err.message });
  }
});
