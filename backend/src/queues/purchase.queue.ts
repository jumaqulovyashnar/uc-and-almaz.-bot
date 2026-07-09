import { Queue } from 'bullmq';
import { redis } from '../config/redis.js';

export const purchaseQueue = new Queue('purchase-orders', {
  connection: redis as any,

  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 1000 },
  },
});

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

export async function addPurchaseJob(orderId: number, data: PurchaseJobData) {
  // Use orderId as jobId for idempotency - avoids double purchases
  return await purchaseQueue.add('purchase', data, {
    jobId: `order_${orderId}`,
  });
}
