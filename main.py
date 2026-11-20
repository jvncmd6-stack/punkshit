import os
import asyncio
import logging
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from aiogram import Bot, Dispatcher

from spark_db import init_spark_db
from spark_module import spark_api, spark_bot_router

logging.basicConfig(level=logging.INFO)

BOT_TOKEN = os.getenv("BOT_TOKEN", "").strip()
RAW_CORS = os.getenv("CORS_ORIGINS", "*").strip()
ALLOW_ORIGINS = ["*"] if RAW_CORS == "*" else [o.strip() for o in RAW_CORS.split(",") if o.strip()]

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()
app = FastAPI(title="PUNKSHIT.OS Spark API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def health_check():
    return {"status": "ok", "service": "PUNKSHIT.OS Spark Backend"}


app.include_router(spark_api)
dp.include_router(spark_bot_router)


async def start_bot():
    if not BOT_TOKEN:
        logging.error("BOT_TOKEN kosong! Bot tidak dijalankan.")
        return
    await bot.delete_webhook(drop_pending_updates=False)
    me = await bot.get_me()
    logging.info(f"Bot aktif: @{me.username} (ID: {me.id})")
    await dp.start_polling(bot, allowed_updates=["message", "callback_query"])


async def main():
    init_spark_db()
    port = int(os.getenv("PORT", "8000"))
    config = uvicorn.Config(app, host="0.0.0.0", port=port, log_level="info")
    server = uvicorn.Server(config)

    await asyncio.gather(
        server.serve(),
        start_bot(),
    )


if __name__ == "__main__":
    asyncio.run(main())
