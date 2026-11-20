import os
import json
import hmac
import hashlib
from urllib.parse import parse_qsl
from fastapi import APIRouter, Request
from aiogram import Router, F, Bot
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

from spark_db import (
    init_spark_db,
    upsert_warga,
    list_warga,
    get_spark_state,
    handle_pair_action,
    record_group_message,
)

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
MINIAPP_URL = os.getenv("MINIAPP_URL", "")
GROUP_CHAT_ID = int(os.getenv("GROUP_CHAT_ID", "0") or "0")

spark_api = APIRouter()
spark_bot_router = Router()

def verify_tg_user(init_data: str) -> dict | None:
    if not init_data or not BOT_TOKEN:
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

@spark_api.get("/api/warga")
async def api_get_warga():
    return {"members": list_warga()}

@spark_api.get("/api/spark/status")
async def api_spark_status(username: str = ""):
    if not username:
        return {"sparkBuddy": None}
    return {"sparkBuddy": get_spark_state(username)}

@spark_api.post("/api/spark/action")
async def api_spark_action(req: Request):
    body = await req.json()
    action = body.get("type", "")
    tg_user = verify_tg_user(body.get("initData", ""))

    actor = (tg_user.get("username") if tg_user else None) or body.get("fromUsername") or body.get("byUsername") or ""
    target = body.get("targetUsername") or body.get("fromUsername") or ""

    if tg_user and tg_user.get("username"):
        upsert_warga(tg_user["id"], tg_user["username"], tg_user.get("first_name", "Warga"))

    ok, msg, target_tg_id = handle_pair_action(action, actor, target)

    if ok and action == "SPARK_INVITE_SEND" and BOT_TOKEN:
        bot = Bot(token=BOT_TOKEN)
        try:
            markup = None
            if MINIAPP_URL:
                markup = InlineKeyboardMarkup(inline_keyboard=[[
                    InlineKeyboardButton(text="🔥 Buka & Terima Ajakan", web_app=WebAppInfo(url=MINIAPP_URL))
                ]])
            notif = (
                f"🔥 <b>Spark Buddies Invite!</b>\n"
                f"@{actor.lstrip('@')} ngajak kamu nyalain api bareng di markas.\n"
                f"Buka PUNKSHIT.OS buat ACC!"
            )
            dest = target_tg_id or GROUP_CHAT_ID
            if dest:
                await bot.send_message(dest, notif, parse_mode="HTML", reply_markup=markup)
        except Exception:
            pass
        finally:
            await bot.session.close()

    return {
        "ok": ok,
        "message": msg,
        "sparkBuddy": get_spark_state(actor) if actor else None
    }

@spark_bot_router.message(F.chat.type.in_({"group", "supergroup"}))
async def on_group_spark_tracker(message: Message):
    if GROUP_CHAT_ID and message.chat.id != GROUP_CHAT_ID:
        return
    user = message.from_user
    if not user or user.is_bot:
        return

    upsert_warga(user.id, user.username, user.first_name)
    if not user.username:
        return

    is_reply_partner = False
    state = get_spark_state(user.username)
    if state and state.get("status") == "paired" and message.reply_to_message and message.reply_to_message.from_user:
        replied_usn = (message.reply_to_message.from_user.username or "").lower()
        if replied_usn == state["partnerUsername"]:
            is_reply_partner = True

    text_content = message.text or message.caption or ""
    qualified_info = record_group_message(user.username, len(text_content), is_reply_partner)

    if qualified_info:
        await message.reply(
            f"🔥 <b>SPARK SECURED!</b>\n"
            f"@{qualified_info['user1']} × @{qualified_info['user2']} sudah aktif bareng hari ini!\n"
            f"Streak: <b>{qualified_info['streak']} Hari</b> · Total XP: <b>{qualified_info['xp']}</b>",
            parse_mode="HTML"
        )
