import { Router } from 'express';
import { createOrder, getOrders, getOrderById } from '../controllers/order.controller.js';
import { telegramAuth } from '../middleware/telegramAuth.js';

const router = Router();

router.post('/', telegramAuth, createOrder);
router.get('/', telegramAuth, getOrders);
router.get('/:id', telegramAuth, getOrderById);

export default router;
