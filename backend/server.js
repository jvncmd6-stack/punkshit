import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { Bot, InlineKeyboard } from 'grammy';

const { BOT_TOKEN, GROUP_ID, WEBAPP_URL, MINIAPP_LINK } = process.env;
const PORT = process.env.PORT || 3000;

// Cek env dulu, biar errornya jelas di log Railway
for (const k of ['BOT_TOKEN', 'GROUP_ID', 'WEBAPP_URL', 'MINIAPP_LINK']) {
  if (!process.env[k]) { console.error('ENV KURANG: ' + k); process.exit(1); }
}

const bot = new Bot(BOT_TOKEN);
const app = express();
// CORS hanya butuh origin (tanpa path). Contoh: https://user.github.io
const ORIGIN = new URL(WEBAPP_URL).origin;
app.use(express.json({ limit: '10kb' }), cors({ origin: ORIGIN }));

const esc = (s = '') => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const GIFTS = { heart: 'Chrome Heart', bolt: 'Neon Bolt', star: 'Punk Star', fish: 'Golden Punkfish', crown: 'Fosil Crown' };

function verify(initData) {
  const p = new URLSearchParams(initData);
  const hash = p.get('hash');
  p.delete('hash');
  const str = [...p.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
  const key = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const sig = crypto.createHmac('sha256', key).update(str).digest('hex');
  if (!hash || sig !== hash) return null;
  if (Date.now() / 1000 - Number(p.get('auth_date')) > 86400) return null;
  try { return JSON.parse(p.get('user')); } catch { return null; }
}

const T = {
  join: u => `🪪 <b>NEW CHARACTER UNLOCKED!</b>\n${u} resmi jadi warga Punkshit. Good luck, rookie.`,
  absen: (u, d) => `🔥 <b>MASIH HIDUP TERNYATA.</b>\n${u} absen hari ke-${Number(d.s) || 1}.`,
  buy: (u, d) => GIFTS[d.g] && `🛒 ${u} baru beli <b>${GIFTS[d.g]}</b>. Gaya bertambah.`,
  gift: (u, d) => GIFTS[d.g] && `🎁 ${u} ngirim <b>${GIFTS[d.g]}</b> ke ${esc(d.to)}!` + (d.m ? `\n"${esc(d.m)}"` : ''),
};

app.get('/', (_req, res) => res.send('ok'));

app.post('/api/event', async (req, res) => {
  const user = verify((req.get('authorization') || '').replace('tma ', ''));
  if (!user) return res.sendStatus(401);
  const { type, data = {} } = req.body || {};
  const text = T[type]?.(esc(user.first_name), data);
  if (!text) return res.sendStatus(400);
  try {
    await bot.api.sendMessage(GROUP_ID, text, { parse_mode: 'HTML' });
    res.json({ ok: true });
  } catch (e) {
    console.error('sendMessage gagal:', e.message);
    res.sendStatus(502);
  }
});

bot.command(['start', 'markas'], ctx => {
  const kb = new InlineKeyboard();
  ctx.chat.type === 'private' ? kb.webApp('🪪 BUKA MARKAS', WEBAPP_URL) : kb.url('🪪 BUKA MARKAS', MINIAPP_LINK);
  return ctx.reply('Markas Punkshit udah buka.', { reply_markup: kb });
});

bot.on('message:new_chat_members', ctx =>
  ctx.reply(`🚨 WOI, ADA ORANG NYASAR!\nWelcome to Punkshit, ${ctx.message.new_chat_members.map(m => m.first_name).join(', ')}!`)
);

bot.catch(err => console.error('Bot error:', err.message));

app.listen(PORT, '0.0.0.0', () => console.log('API jalan di port ' + PORT));
bot.start({ drop_pending_updates: true });
