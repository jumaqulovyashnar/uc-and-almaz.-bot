import { Router } from 'express';
import { getStats, getOrders, retryOrder, getBotStatus, updateConfig } from '../controllers/admin.controller.js';
import { telegramAuth } from '../middleware/telegramAuth.js';
import { adminAuth } from '../middleware/adminAuth.js';

const router = Router();

// Apply auth middleware to all admin routes
router.use(telegramAuth);
router.use(adminAuth);

router.get('/stats', getStats);
router.get('/orders', getOrders);
router.post('/orders/:id/retry', retryOrder);
router.get('/bot-status', getBotStatus);
router.put('/config', updateConfig);

export default router;
