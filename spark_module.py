import os
import json
import hmac
import base64
import hashlib
from urllib.parse import parse_qsl
from fastapi import APIRouter, Request
from aiogram import Router, F, Bot
from aiogram.filters import Command
from aiogram.types import (
    Message,
    CallbackQuery,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    WebAppInfo,
)

from spark_db import (
    upsert_warga,
    list_warga,
    get_spark_state,
    handle_pair_action,
    record_group_message,
)

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
GROUP_ID = int(os.getenv("GROUP_ID", "0") or "0")
CHANNEL_ID = int(os.getenv("CHANNEL_ID", "0") or "0")
WAREHOUSE_CHANNEL_ID = int(os.getenv("WAREHOUSE_CHANNEL_ID", "0") or "0")
OWNER_IDS = [int(x.strip()) for x in os.getenv("OWNER_IDS", "").split(",") if x.strip().isdigit()]

WEBAPP_URL = os.getenv("WEBAPP_URL", "").rstrip("/")
MINIAPP_LINK = os.getenv("MINIAPP_LINK", "").rstrip("/")
GROUP_URL = os.getenv("GROUP_URL", "")
CHANNEL_URL = os.getenv("CHANNEL_URL", "")

RAILWAY_DOMAIN = os.getenv("RAILWAY_PUBLIC_DOMAIN", "")
PUBLIC_API_URL = f"https://{RAILWAY_DOMAIN}" if RAILWAY_DOMAIN else ""

spark_api = APIRouter()
spark_bot_router = Router()


def encode_start_param(route: str = "spark") -> str:
    if not PUBLIC_API_URL:
        return route
    b64 = base64.urlsafe_b64encode(PUBLIC_API_URL.encode()).decode().rstrip("=")
    return f"{route}__{b64}"


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


def build_invite_keyboard(is_private_chat: bool, actor: str, target: str) -> InlineKeyboardMarkup:
    rows = []
    start_val = encode_start_param("spark")

    # Baris 1: Tombol buka Mini App (otomatis bawa URL API Railway)
    if is_private_chat and WEBAPP_URL:
        sep = "&" if "?" in WEBAPP_URL else "?"
        api_q = f"&spark_api={PUBLIC_API_URL}" if PUBLIC_API_URL else ""
        target_url = f"{WEBAPP_URL}{sep}startapp={start_val}{api_q}"
        rows.append([InlineKeyboardButton(text="🔥 Buka Mini App", web_app=WebAppInfo(url=target_url))])
    elif MINIAPP_LINK:
        sep = "&" if "?" in MINIAPP_LINK else "?"
        target_link = f"{MINIAPP_LINK}{sep}startapp={start_val}"
        rows.append([InlineKeyboardButton(text="🔥 Buka Mini App", url=target_link)])
    elif WEBAPP_URL:
        rows.append([InlineKeyboardButton(text="🔥 Buka Mini App", url=WEBAPP_URL)])

    # Baris 2: Tombol ACC / Tolak langsung di chat Telegram
    a = actor.lstrip("@").lower()
    t = target.lstrip("@").lower()
    rows.append([
        InlineKeyboardButton(text="✅ ACC Ajakan", callback_data=f"spark_acc:{a}:{t}"),
        InlineKeyboardButton(text="❌ Tolak", callback_data=f"spark_dec:{a}:{t}"),
    ])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def build_open_button(is_private_chat: bool, route: str = "spark") -> InlineKeyboardMarkup | None:
    start_val = encode_start_param(route)
    if is_private_chat and WEBAPP_URL:
        sep = "&" if "?" in WEBAPP_URL else "?"
        api_q = f"&spark_api={PUBLIC_API_URL}" if PUBLIC_API_URL else ""
        target_url = f"{WEBAPP_URL}{sep}startapp={start_val}{api_q}"
        return InlineKeyboardMarkup(inline_keyboard=[[
            InlineKeyboardButton(text="🔥 Buka Spark Buddies", web_app=WebAppInfo(url=target_url))
        ]])
    if MINIAPP_LINK:
        sep = "&" if "?" in MINIAPP_LINK else "?"
        target_link = f"{MINIAPP_LINK}{sep}startapp={start_val}"
        return InlineKeyboardMarkup(inline_keyboard=[[
            InlineKeyboardButton(text="🔥 Buka Spark Buddies", url=target_link)
        ]])
    return None


@spark_api.get("/api/spark/config")
async def api_spark_config():
    return {
        "spark_api_url": PUBLIC_API_URL,
        "group_url": GROUP_URL,
        "channel_url": CHANNEL_URL,
        "webapp_url": WEBAPP_URL,
        "miniapp_link": MINIAPP_LINK,
    }


@spark_api.get("/api/spark/warga")
async def api_get_spark_warga():
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
            notif = (
                f"🔥 <b>Spark Buddies Invite!</b>\n"
                f"@{actor.lstrip('@')} ngajak @{target.lstrip('@')} nyalain api bareng di markas.\n"
                f"Klik tombol di bawah atau buka Mini App buat ACC!"
            )
            sent_dm = False
            if target_tg_id:
                try:
                    await bot.send_message(
                        target_tg_id,
                        notif,
                        parse_mode="HTML",
                        reply_markup=build_invite_keyboard(True, actor, target),
                    )
                    sent_dm = True
                except Exception:
                    sent_dm = False

            if not sent_dm and GROUP_ID:
                await bot.send_message(
                    GROUP_ID,
                    notif,
                    parse_mode="HTML",
                    reply_markup=build_invite_keyboard(False, actor, target),
                )
        except Exception:
            pass
        finally:
            await bot.session.close()

    return {
        "ok": ok,
        "message": msg,
        "sparkBuddy": get_spark_state(actor) if actor else None,
    }


@spark_bot_router.callback_query(F.data.startswith(("spark_acc:", "spark_dec:")))
async def cb_spark_decision(callback: CallbackQuery):
    parts = callback.data.split(":")
    if len(parts) != 3:
        return
    mode, sender, target = parts
    clicker = (callback.from_user.username or "").lower()

    if not clicker or clicker != target:
        await callback.answer(f"Cuma @{target} yang bisa pencet tombol ini!", show_alert=True)
        return

    upsert_warga(callback.from_user.id, clicker, callback.from_user.first_name)

    if mode == "spark_acc":
        ok, msg, _ = handle_pair_action("SPARK_INVITE_ACCEPT", clicker, sender)
        if ok:
            await callback.message.edit_text(
                f"🔥 <b>SPARK RESMI MENYALA!</b>\n"
                f"@{sender} x @{clicker} sekarang jadi Spark Buddies!",
                parse_mode="HTML",
            )
            await callback.answer("Spark resmi menyala! 🔥")
        else:
            await callback.answer(msg, show_alert=True)
    else:
        handle_pair_action("SPARK_INVITE_DECLINE", clicker, sender)
        await callback.message.edit_text(
            f"💨 Ajakan Spark dari @{sender} ke @{clicker} ditolak.",
            parse_mode="HTML",
        )
        await callback.answer("Ajakan ditolak.")


@spark_bot_router.message(Command("acc"))
async def cmd_acc_spark(message: Message):
    user = message.from_user
    if not user or not user.username:
        await message.reply("Pasang @username Telegram dulu sebelum pakai Spark Buddies.")
        return

    usn = user.username.lower()
    upsert_warga(user.id, usn, user.first_name)
    state = get_spark_state(usn)

    if not state or state.get("status") != "incoming":
        await message.reply("Nggak ada ajakan Spark yang masuk buat kamu saat ini.")
        return

    sender = state["fromUsername"]
    ok, msg, _ = handle_pair_action("SPARK_INVITE_ACCEPT", usn, sender)
    if ok:
        await message.reply(
            f"🔥 <b>SPARK RESMI MENYALA!</b>\n@{sender} x @{usn} sekarang terhubung!",
            parse_mode="HTML",
        )
    else:
        await message.reply(msg)


@spark_bot_router.message(Command("spark"))
async def cmd_spark(message: Message):
    is_private = message.chat.type == "private"
    kb = build_open_button(is_private_chat=is_private, route="spark")
    await message.reply(
        "🔥 <b>Spark Buddies</b>\nNyalain api bareng partner markas kamu!",
        parse_mode="HTML",
        reply_markup=kb,
    )


@spark_bot_router.message(F.chat.type.in_({"group", "supergroup"}))
async def on_group_spark_tracker(message: Message):
    if GROUP_ID and message.chat.id != GROUP_ID:
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
            f"@{qualified_info['user1']} x @{qualified_info['user2']} sudah aktif bareng hari ini!\n"
            f"Streak: <b>{qualified_info['streak']} Hari</b> · Total XP: <b>{qualified_info['xp']}</b>",
            parse_mode="HTML",
        )
