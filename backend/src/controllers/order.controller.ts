import type { Response, NextFunction } from 'express';
import { z } from 'zod';
import * as orderService from '../services/order.service.js';
import * as packageService from '../services/package.service.js';
import { addPurchaseJob } from '../queues/purchase.queue.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthRequest } from '../types/index.js';

const createOrderSchema = z.object({
  game: z.enum(['pubg', 'freefire']),
  category: z.string().min(1),
  package_id: z.number().int().positive(),
  player_id: z.string().min(1).max(50),
  player_nickname: z.string().max(100).optional(),
  payment_method: z.string().max(50).optional(),
});

export async function createOrder(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const input = createOrderSchema.parse(req.body);

    // Verify package exists
    const pkg = await packageService.getById(input.package_id);
    if (!pkg) {
      throw new AppError('Package not found', 404);
    }

    // Create order
    const order = await orderService.create({
      user_id: req.user.id,
      game: input.game,
      category: input.category,
      package_id: input.package_id,
      package_name: pkg.name,
      amount: pkg.amount,
      price: parseFloat(pkg.sell_price),
      player_id: input.player_id,
      player_nickname: input.player_nickname,
      payment_method: input.payment_method,
    });

    // Add to purchase queue
    await addPurchaseJob(order.id, {
      order_id: order.id,
      game: order.game,
      category: order.category,
      package_name: order.package_name,
      amount: order.amount,
      player_id: order.player_id,
      player_nickname: order.player_nickname ?? undefined,
    });


    res.status(201).json({
      success: true,
      data: { order },
    });
  } catch (error) {
    next(error);
  }
}

export async function getOrders(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const limit = parseInt(req.query.limit as string, 10) || 20;
    const offset = parseInt(req.query.offset as string, 10) || 0;

    const result = await orderService.getByUserId(req.user.id, limit, offset);

    res.json({
      success: true,
      data: {
        orders: result.orders,
        total: result.total,
        limit,
        offset,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getOrderById(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const orderId = parseInt(req.params.id, 10);
    if (isNaN(orderId)) {
      throw new AppError('Invalid order ID', 400);
    }

    const order = await orderService.getById(orderId);
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Ensure user can only see their own orders
    if (order.user_id !== req.user.id) {
      throw new AppError('Order not found', 404);
    }

    res.json({
      success: true,
      data: { order },
    });
  } catch (error) {
    next(error);
  }
}
