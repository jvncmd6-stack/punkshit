import { db } from '../../database/db.js';
import { ENV } from '../../config/env.js';

export function initAdminTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_id TEXT NOT NULL,
      action TEXT NOT NULL,
      detail TEXT NOT NULL,
      created_at INTEGER NOT NULL
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

  try { db.exec('ALTER TABLE users ADD COLUMN is_frozen INTEGER DEFAULT 0'); } catch (_) {}
  try { db.exec('ALTER TABLE items ADD COLUMN is_archived INTEGER DEFAULT 0'); } catch (_) {}
  try { db.exec('ALTER TABLE items ADD COLUMN is_limited INTEGER DEFAULT 0'); } catch (_) {}
  try { db.exec("ALTER TABLE inventory ADD COLUMN item_snapshot TEXT DEFAULT ''"); } catch (_) {}
}

export function isOwnerUser(user) {
  if (!user) return false;
  const ownerIds = (ENV.OWNER_IDS || []).map(String);
  return ownerIds.includes(String(user.id)) || user.role === 'owner';
}

export function isAdminUser(user) {
  if (!user) return false;
  if (isOwnerUser(user)) return true;
  return user.role === 'admin' || user.role === 'moderator';
}

export function isOwnerOnly(req) {
  if (req.dbUser && isOwnerUser(req.dbUser)) return true;
  const uid = String(req.tgUser?.id || req.dbUser?.id || req.query.ownerId || '');
  const ownerIds = (ENV.OWNER_IDS || []).map(String);
  return Boolean(uid && ownerIds.includes(uid));
}

export function logAudit(actorId, action, detail) {
  try {
    db.prepare('INSERT INTO audit_logs (actor_id, action, detail, created_at) VALUES (?, ?, ?, ?)')
      .run(String(actorId), action, detail, Date.now());
  } catch (_) {}
}
