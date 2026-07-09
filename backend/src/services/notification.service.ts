import { bot } from '../bot/bot.js';
import { env } from '../config/env.js';

interface OrderInfo {
  id: number;
  package_name: string;
  status: string;
  player_id: string;
  price: string | number;
  game: string;
  error_message?: string | null;
}

export async function sendOrderUpdate(
  telegramId: number,
  orderInfo: OrderInfo
): Promise<void> {
  try {
    const statusEmoji: Record<string, string> = {
      pending: '⏳',
      processing: '🔄',
      completed: '✅',
      failed: '❌',
      cancelled: '🚫',
    };

    const emoji = statusEmoji[orderInfo.status] || '📦';
    const gameName = orderInfo.game === 'pubg' ? 'PUBG Mobile' : 'Free Fire';

    let message = `${emoji} <b>Buyurtma yangilandi</b>\n\n`;
    message += `📋 Buyurtma: #${orderInfo.id}\n`;
    message += `🎮 O'yin: ${gameName}\n`;
    message += `📦 Paket: ${orderInfo.package_name}\n`;
    message += `🆔 Player ID: ${orderInfo.player_id}\n`;
    message += `💰 Narx: ${Number(orderInfo.price).toLocaleString()} UZS\n`;
    message += `📊 Status: <b>${orderInfo.status.toUpperCase()}</b>\n`;

    if (orderInfo.status === 'failed' && orderInfo.error_message) {
      message += `\n⚠️ Xatolik: ${orderInfo.error_message}`;
    }

    if (orderInfo.status === 'completed') {
      message += `\n🎉 Buyurtmangiz muvaffaqiyatli bajarildi!`;
    }

    await bot.api.sendMessage(telegramId, message, { parse_mode: 'HTML' });
  } catch (error) {
    console.error('[Notification] sendOrderUpdate error:', (error as Error).message);
  }
}

export async function sendAdminAlert(
  message: string,
  screenshotPath?: string
): Promise<void> {
  try {
    const adminId = parseInt(env.ADMIN_TELEGRAM_ID, 10);
    const alertMessage = `🔔 <b>Admin Alert</b>\n\n${message}`;

    if (screenshotPath) {
      await bot.api.sendPhoto(adminId, screenshotPath, {
        caption: alertMessage,
        parse_mode: 'HTML',
      });
    } else {
      await bot.api.sendMessage(adminId, alertMessage, { parse_mode: 'HTML' });
    }
  } catch (error) {
    console.error('[Notification] sendAdminAlert error:', (error as Error).message);
  }
}
