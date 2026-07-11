import { Worker, Job } from 'bullmq';
import { redis } from '../config/redis.js';
import * as orderService from '../services/order.service.js';
import { sendOrderUpdate, sendAdminAlert } from '../services/notification.service.js';
import { runGarenaAutomation, runMidasbuyAutomation } from '../services/automation.service.js';

interface PurchaseJobData {
  order_id: number;
  game: string;
  category: string;
  package_name: string;
  amount: number;
  player_id: string;
  player_nickname?: string;
  retry?: boolean;
}

export const purchaseWorker = new Worker(
  'purchase-orders',
  async (job: Job<PurchaseJobData>) => {
    const { order_id, game, package_name, player_id, player_nickname } = job.data;
    console.log(`[Worker] Started processing order #${order_id} for ${game} (${package_name})`);

    try {
      // 1. Update order status to 'processing'
      await orderService.updateStatus(order_id, 'processing');

      // 2. Execute browser automation (real for Free Fire and PUBG)
      if (game === 'freefire') {
        const result = await runGarenaAutomation(player_id);
        if (!result.success) {
          throw new Error(result.error || 'Garena automation failed');
        }
      } else if (game === 'pubg') {
        const result = await runMidasbuyAutomation(player_id, package_name);
        if (!result.success) {
          throw new Error(result.error || 'Midasbuy automation failed');
        }
      } else {
        throw new Error(`Unsupported game: ${game}`);
      }

      // 3. Mark order as completed
      await orderService.updateStatus(order_id, 'completed', {
        completed_at: new Date(),
      });

      // Fetch updated order to get full details for notification
      const updatedOrder = await orderService.getById(order_id);
      if (updatedOrder) {
        // 4. Send Telegram message to user
        await sendOrderUpdate(updatedOrder.telegram_id, updatedOrder);
      }

      console.log(`[Worker] Successfully completed order #${order_id}`);
      return { success: true };
    } catch (error) {
      const errorMessage = (error as Error).message || 'Unknown automation error';
      console.error(`[Worker] Error processing order #${order_id}:`, errorMessage);

      // Update status to failed
      await orderService.updateStatus(order_id, 'failed', {
        error_message: errorMessage,
      });

      const updatedOrder = await orderService.getById(order_id);
      if (updatedOrder) {
        // Send alert to user
        await sendOrderUpdate(updatedOrder.telegram_id, updatedOrder);
        // Send alert to admin
        await sendAdminAlert(
          `❌ *Buyurtma Xatoligi!* \n` +
          `Buyurtma ID: #${order_id}\n` +
          `O'yin: ${game.toUpperCase()}\n` +
          `Paket: ${package_name}\n` +
          `O'yinchi ID: ${player_id}\n` +
          `Taxallusi: ${player_nickname || 'Noma\'lum'}\n` +
          `Xatolik: ${errorMessage}`
        );
      }

      throw error; // Let BullMQ handle retry mechanism
    }
  },
  {
    connection: redis as any,
    concurrency: 2, // process up to 2 purchases concurrently
  }
);


purchaseWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});

purchaseWorker.on('completed', (job) => {
  console.log(`[Worker] Job ${job?.id} completed`);
});
