import { Bot, InlineKeyboard } from 'grammy';
import { env } from '../config/env.js';

if (!env.BOT_TOKEN) {
  throw new Error('BOT_TOKEN is not defined in environment variables');
}

export const bot = new Bot(env.BOT_TOKEN);

// /start command
bot.command('start', async (ctx) => {
  const firstName = ctx.from?.first_name || 'Foydalanuvchi';
  
  const welcomeMessage = 
    `Salom, *${firstName}*! 👋\n\n` +
    `🎮 *CyberPay* botiga xush kelibsiz!\n\n` +
    `Bu yerda siz PUBG Mobile UC va Free Fire Olmoslarini tezkor va xavfsiz sotib olishingiz mumkin.\n\n` +
    `Sotib olishni boshlash uchun quyidagi tugmani bosing 👇`;

  const keyboard = new InlineKeyboard().webApp('CyberPay ni ochish 🚀', env.WEBAPP_URL);

  await ctx.reply(welcomeMessage, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  });
});

// /help command
bot.command('help', async (ctx) => {
  const helpMessage =
    `❓ *Yordam bo'limi*\n\n` +
    `• /start - Botni ishga tushirish va do'konni ochish\n` +
    `• /help - Ushbu yordam xabarini ko'rsatish\n` +
    `• Mini App orqali Uzcard, Humo va Visa to'lovlaridan foydalanib o'yin valyutalarini avtomatik xarid qiling.\n\n` +
    `Savollar yoki muammolar yuzaga kelsa, admin bilan bog'laning.`;

  await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
});

// General message handler
bot.on('message', async (ctx) => {
  const keyboard = new InlineKeyboard().webApp('Do\'konni ochish 🎮', env.WEBAPP_URL);
  await ctx.reply('Sotib olishni boshlash uchun quyidagi tugmani bosing 👇', {
    reply_markup: keyboard,
  });
});

// Catch errors
bot.catch((err) => {
  console.error('[Bot Error] Error occurred in bot update:', err.error);
});

export async function startBot() {
  // Start bot in long polling mode and catch credentials errors
  bot.start({
    onStart: (botInfo) => {
      console.log(`[Bot] Started @${botInfo.username} successfully`);
    },
  }).catch((err) => {
    console.error('\n⚠️ [Bot] Warning: Grammy bot failed to start.');
    console.error('👉 Message:', err.message);
    console.error('👉 Please verify your BOT_TOKEN in .env file.\n');
  });
}

