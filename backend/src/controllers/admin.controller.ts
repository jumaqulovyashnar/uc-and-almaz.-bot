import type { Response, NextFunction } from 'express';
import * as orderService from '../services/order.service.js';
import { addPurchaseJob } from '../queues/purchase.queue.js';
import { query } from '../config/database.js';
import { redis } from '../config/redis.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthRequest, DbSystemConfig } from '../types/index.js';

export async function getStats(
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const stats = await orderService.getStats();

    res.json({
      success: true,
      data: { stats },
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
    const filters = {
      status: req.query.status as string | undefined,
      game: req.query.game as string | undefined,
      user_id: req.query.user_id ? parseInt(req.query.user_id as string, 10) : undefined,
      date_from: req.query.date_from as string | undefined,
      date_to: req.query.date_to as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
    };

    const result = await orderService.getAdminOrders(filters);

    res.json({
      success: true,
      data: {
        orders: result.orders,
        total: result.total,
        limit: filters.limit,
        offset: filters.offset,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function retryOrder(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orderId = parseInt(req.params.id, 10);
    if (isNaN(orderId)) {
      throw new AppError('Invalid order ID', 400);
    }

    const order = await orderService.getById(orderId);
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (order.status !== 'failed') {
      throw new AppError('Only failed orders can be retried', 400);
    }

    // Reset status to pending
    await orderService.updateStatus(orderId, 'pending');

    // Re-add to queue
    await addPurchaseJob(orderId, {
      order_id: orderId,
      game: order.game,
      category: order.category,
      package_name: order.package_name,
      amount: order.amount,
      player_id: order.player_id,
      player_nickname: order.player_nickname ?? undefined,
      retry: true,
    });


    res.json({
      success: true,
      data: { message: 'Order re-queued for processing' },
    });
  } catch (error) {
    next(error);
  }
}

export async function getBotStatus(
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Database health
    let dbStatus = 'healthy';
    try {
      await query('SELECT 1');
    } catch {
      dbStatus = 'unhealthy';
    }

    // Redis health
    let redisStatus = 'healthy';
    try {
      await redis.ping();
    } catch {
      redisStatus = 'unhealthy';
    }

    // System config
    const configResult = await query<DbSystemConfig>(
      'SELECT key, value FROM system_config'
    );
    const config: Record<string, unknown> = {};
    for (const row of configResult.rows) {
      config[row.key] = row.value;
    }

    res.json({
      success: true,
      data: {
        status: 'running',
        database: dbStatus,
        redis: redisStatus,
        config,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateConfig(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { key, value } = req.body as { key?: string; value?: unknown };

    if (!key || value === undefined) {
      throw new AppError('Key and value are required', 400);
    }

    const allowedKeys = ['maintenance_pubg', 'maintenance_freefire'];
    if (!allowedKeys.includes(key)) {
      throw new AppError(`Invalid config key. Allowed: ${allowedKeys.join(', ')}`, 400);
    }

    await query(
      `INSERT INTO system_config (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [key, JSON.stringify(value)]
    );

    res.json({
      success: true,
      data: { key, value, message: 'Config updated successfully' },
    });
  } catch (error) {
    next(error);
  }
}
