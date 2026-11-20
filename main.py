import os
import json
import hmac
import hashlib
from urllib.parse import parse_qsl
import asyncio
import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from aiogram import Bot, Dispatcher, F
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

from spark_db import init_db, upsert_warga, list_warga, get_spark_state, handle_pair_action, record_group_message

BOT_TOKEN = os.getenv("BOT_TOKEN", "ISI_TOKEN_BOT_KAMU")
MINIAPP_URL = os.getenv("MINIAPP_URL", "https://domain-punkshit-kamu.vercel.app")
GROUP_CHAT_ID = int(os.getenv("GROUP_CHAT_ID", "0"))  # ID grup markas (opsional, 0 = semua grup)

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def verify_tg_user(init_data: str) -> dict | None:
    """Validasi initData Telegram WebApp agar tidak bisa dipalsukan."""
    if not init_data:
        return None
    parsed = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = parsed.pop("hash", None)
    if not received_hash:
        return None
    data_check = "\n".join(f"{k}={v}" for k, v in sorted(parsed.items()))
    secret_key = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
    calc_hash = hmac.new(secret_key, data_check.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(calc_hash, received_hash):
        return None
    return json.loads(parsed.get("user", "{}"))

# --- ENDPOINT API UNTUK PUNKSHIT.OS ---

@app.get("/api/warga")
async def api_get_warga():
    return {"members": list_warga()}

@app.get("/api/spark/status")
async def api_spark_status(username: str = ""):
    if not username:
        return {"sparkBuddy": None}
    return {"sparkBuddy": get_spark_state(username)}

@app.post("/api/spark/action")
async def api_spark_action(req: Request):
    body = await req.json()
    action = body.get("type", "")
    tg_user = verify_tg_user(body.get("initData", ""))

    # Ambil actor dari Telegram initData yang terverifikasi, atau fallback payload
    actor = (tg_user.get("username") if tg_user else None) or body.get("fromUsername") or body.get("byUsername") or ""
    target = body.get("targetUsername") or body.get("fromUsername") or ""

    if tg_user and tg_user.get("username"):
        upsert_warga(tg_user["id"], tg_user["username"], tg_user.get("first_name", "Warga"))

    ok, msg, target_tg_id = handle_pair_action(action, actor, target)

    # Kirim notifikasi ke Telegram jika ada ajakan masuk
    if ok and action == "SPARK_INVITE_SEND":
        kb = InlineKeyboardMarkup(inline_keyboard=[[
            InlineKeyboardButton(text="🔥 Buka & Terima Ajakan", web_app=WebAppInfo(url=MINIAPP_URL))
        ]])
        notif_text = f"🔥 <b>Spark Buddies Invite!</b>\n@{actor.lstrip('@')} ngajak kamu nyalain api bareng di markas.\nBuka PUNKSHIT.OS buat ACC!"
        try:
            if target_tg_id:
                await bot.send_message(target_tg_id, notif_text, parse_mode="HTML", reply_markup=kb)
            elif GROUP_CHAT_ID:
                await bot.send_message(GROUP_CHAT_ID, notif_text, parse_mode="HTML", reply_markup=kb)
        except Exception:
            pass

    return {
        "ok": ok,
        "message": msg,
        "sparkBuddy": get_spark_state(actor) if actor else None
    }

# --- BOT LISTENER GRUP (AUTO-DETEK @USN & HITUNG GAP) ---

@dp.message(F.chat.type.in_({"group", "supergroup"}))
async def on_group_message(message: Message):
    if GROUP_CHAT_ID and message.chat.id != GROUP_CHAT_ID:
        return
    user = message.from_user
    if not user or user.is_bot:
        return

    # 1. Auto-simpan @username warga ke database
    upsert_warga(user.id, user.username, user.first_name)

    if not user.username:
        return

    # 2. Cek apakah sedang me-reply partner Spark-nya
    is_reply_partner = False
    state = get_spark_state(user.username)
    if state and state.get("status") == "paired" and message.reply_to_message and message.reply_to_message.from_user:
        replied_usn = (message.reply_to_message.from_user.username or "").lower()
        if replied_usn == state["partnerUsername"]:
            is_reply_partner = True

    # 3. Catat GAP & pesan harian
    text_content = message.text or message.caption or ""
    qualified_info = record_group_message(user.username, len(text_content), is_reply_partner)

    # 4. Umumkan di grup jika pasangan baru saja mengamankan streak hari ini
    if qualified_info:
        await message.reply(
            f"🔥 <b>SPARK SECURED!</b>\n"
            f"@{qualified_info['user1']} × @{qualified_info['user2']} sudah aktif bareng hari ini!\n"
            f"Streak: <b>{qualified_info['streak']} Hari</b> · Total XP: <b>{qualified_info['xp']}</b>",
            parse_mode="HTML"
        )

async def main():
    init_db()
    port = int(os.getenv("PORT", "8000"))
    config = uvicorn.Config(app, host="0.0.0.0", port=port, log_level="info")
    server = uvicorn.Server(config)

    await asyncio.gather(
        server.serve(),
        dp.start_polling(bot)
    )

if __name__ == "__main__":
    asyncio.run(main())

from spark_db import init_spark_db
from spark_module import spark_api, spark_bot_router

# 1. Jalankan saat startup:
init_spark_db()

# 2. Pasang endpoint API ke FastAPI app kamu:
app.include_router(spark_api)

# 3. Pasang listener grup di urutan PALING BAWAH Dispatcher kamu (setelah semua @dp.message command lain):
dp.include_router(spark_bot_router)
