import sqlite3
from datetime import datetime, timezone, timedelta

WIB = timezone(timedelta(hours=7))
DB_PATH = "punkshit_spark.db"

def today_wib() -> str:
    return datetime.now(WIB).strftime("%Y-%m-%d")

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_conn() as c:
        c.executescript("""
        CREATE TABLE IF NOT EXISTS warga (
            telegram_id INTEGER PRIMARY KEY,
            username TEXT UNIQUE,
            name TEXT,
            rank TEXT DEFAULT 'Warga Markas',
            updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS spark_pairs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user1 TEXT NOT NULL,          -- pengirim ajakan (lowercase tanpa @)
            user2 TEXT NOT NULL,          -- penerima ajakan (lowercase tanpa @)
            status TEXT NOT NULL,         -- 'pending' | 'paired'
            streak INTEGER DEFAULT 0,
            xp INTEGER DEFAULT 0,
            last_qualified_date TEXT DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS daily_activity (
            date TEXT NOT NULL,
            username TEXT NOT NULL,
            gap INTEGER DEFAULT 0,
            msg INTEGER DEFAULT 0,
            last_msg_ts INTEGER DEFAULT 0,
            PRIMARY KEY (date, username)
        );
        """)

def upsert_warga(telegram_id: int, username: str | None, name: str):
    if not username:
        return
    usn = username.lstrip("@").lower()
    with get_conn() as c:
        c.execute("""
        INSERT INTO warga (telegram_id, username, name, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(telegram_id) DO UPDATE SET
            username = excluded.username,
            name = excluded.name,
            updated_at = excluded.updated_at
        """, (telegram_id, usn, name, datetime.now(WIB).isoformat()))

def list_warga():
    with get_conn() as c:
        rows = c.execute("SELECT telegram_id as id, username, name, rank FROM warga WHERE username IS NOT NULL ORDER BY updated_at DESC").fetchall()
        return [dict(r) for r in rows]

def get_spark_state(username: str) -> dict | None:
    usn = username.lstrip("@").lower()
    today = today_wib()
    with get_conn() as c:
        pair = c.execute("""
            SELECT * FROM spark_pairs
            WHERE (user1 = ? OR user2 = ?) AND status IN ('pending', 'paired')
            ORDER BY id DESC LIMIT 1
        """, (usn, usn)).fetchone()

        if not pair:
            return None

        if pair["status"] == "pending":
            if pair["user1"] == usn:
                return {"status": "outgoing", "targetUsername": pair["user2"]}
            return {"status": "incoming", "fromUsername": pair["user1"]}

        partner = pair["user2"] if pair["user1"] == usn else pair["user1"]
        a1 = c.execute("SELECT gap, msg FROM daily_activity WHERE date = ? AND username = ?", (today, usn)).fetchone()
        a2 = c.execute("SELECT gap, msg FROM daily_activity WHERE date = ? AND username = ?", (today, partner)).fetchone()

        return {
            "status": "paired",
            "partnerUsername": partner,
            "streak": pair["streak"],
            "xp": pair["xp"],
            "g1": {"gap": a1["gap"] if a1 else 0, "msg": a1["msg"] if a1 else 0},
            "g2": {"gap": a2["gap"] if a2 else 0, "msg": a2["msg"] if a2 else 0},
        }

def handle_pair_action(action: str, actor: str, target: str) -> tuple[bool, str, int | None]:
    actor = actor.lstrip("@").lower()
    target = target.lstrip("@").lower()

    with get_conn() as c:
        if action == "SPARK_INVITE_SEND":
            if not actor or not target or actor == target:
                return False, "Username tidak valid", None
            existing = c.execute("""
                SELECT 1 FROM spark_pairs
                WHERE (user1 IN (?, ?) OR user2 IN (?, ?)) AND status IN ('pending', 'paired')
            """, (actor, target, actor, target)).fetchone()
            if existing:
                return False, "Salah satu sudah terhubung / punya ajakan aktif", None

            t_row = c.execute("SELECT telegram_id FROM warga WHERE username = ?", (target,)).fetchone()
            c.execute("INSERT INTO spark_pairs (user1, user2, status) VALUES (?, ?, 'pending')", (actor, target))
            return True, "Ajakan terkirim", (t_row["telegram_id"] if t_row else None)

        elif action == "SPARK_INVITE_ACCEPT":
            row = c.execute("""
                SELECT id FROM spark_pairs WHERE user1 = ? AND user2 = ? AND status = 'pending'
            """, (target, actor)).fetchone()
            if not row:
                return False, "Ajakan tidak ditemukan", None
            c.execute("UPDATE spark_pairs SET status = 'paired' WHERE id = ?", (row["id"],))
            return True, "Spark resmi menyala!", None

        elif action in ("SPARK_INVITE_DECLINE", "SPARK_INVITE_CANCEL", "SPARK_UNPAIR"):
            c.execute("""
                DELETE FROM spark_pairs
                WHERE (user1 = ? AND user2 = ?) OR (user1 = ? AND user2 = ?)
            """, (actor, target, target, actor))
            return True, "Koneksi dihapus", None

    return False, "Aksi tidak dikenal", None

def record_group_message(username: str, text_len: int, is_reply_to_partner: bool = False) -> dict | None:
    """Dipanggil bot tiap ada pesan di grup. Return info jika hari ini baru saja Qualified berdua."""
    if not username or text_len < 3:
        return None  # Abaikan spam pendek (< 3 huruf)

    usn = username.lstrip("@").lower()
    today = today_wib()
    now_ts = int(datetime.now(WIB).timestamp())

    with get_conn() as c:
        row = c.execute("SELECT gap, msg, last_msg_ts FROM daily_activity WHERE date = ? AND username = ?", (today, usn)).fetchone()
        # Tambah +1 GAP jika jeda minimal 30 detik dari pesan sebelumnya (anti-flood)
        gap_add = 1 if (not row or (now_ts - row["last_msg_ts"]) >= 30) else 0
        new_gap = (row["gap"] if row else 0) + gap_add
        new_msg = (row["msg"] if row else 0) + 1

        c.execute("""
            INSERT INTO daily_activity (date, username, gap, msg, last_msg_ts)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(date, username) DO UPDATE SET
                gap = excluded.gap, msg = excluded.msg, last_msg_ts = excluded.last_msg_ts
        """, (today, usn, new_gap, new_msg, now_ts))

        pair = c.execute("""
            SELECT * FROM spark_pairs WHERE (user1 = ? OR user2 = ?) AND status = 'paired'
        """, (usn, usn)).fetchone()
        if not pair:
            return None

        partner = pair["user2"] if pair["user1"] == usn else pair["user1"]

        # Bonus +5 XP jika saling reply pesan partner di grup
        if is_reply_to_partner:
            c.execute("UPDATE spark_pairs SET xp = xp + 5 WHERE id = ?", (pair["id"],))

        # Cek apakah hari ini keduanya sudah mencapai 5 GAP & 2 pesan valid
        p_act = c.execute("SELECT gap, msg FROM daily_activity WHERE date = ? AND username = ?", (today, partner)).fetchone()
        if p_act and new_gap >= 5 and new_msg >= 2 and p_act["gap"] >= 5 and p_act["msg"] >= 2:
            if pair["last_qualified_date"] != today:
                new_streak = pair["streak"] + 1
                new_xp = pair["xp"] + 10
                c.execute("""
                    UPDATE spark_pairs
                    SET streak = ?, xp = ?, last_qualified_date = ?
                    WHERE id = ?
                """, (new_streak, new_xp, today, pair["id"]))
                return {"user1": usn, "user2": partner, "streak": new_streak, "xp": new_xp}

    return None
