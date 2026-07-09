import { query } from '../config/database.js';
import type { DbOrder, OrderFilters, DashboardStats } from '../types/index.js';

interface OrderCreateData {
  user_id: number;
  game: string;
  category: string;
  package_id: number;
  package_name: string;
  amount: number;
  price: number;
  player_id: string;
  player_nickname?: string;
  payment_method?: string;
}

export async function create(orderData: OrderCreateData): Promise<DbOrder> {
  try {
    const result = await query<DbOrder>(
      `INSERT INTO orders (user_id, game, category, package_id, package_name, amount, price, player_id, player_nickname, payment_method)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        orderData.user_id,
        orderData.game,
        orderData.category,
        orderData.package_id,
        orderData.package_name,
        orderData.amount,
        orderData.price,
        orderData.player_id,
        orderData.player_nickname || null,
        orderData.payment_method || null,
      ]
    );
    return result.rows[0];
  } catch (error) {
    console.error('[OrderService] create error:', (error as Error).message);
    throw error;
  }
}

export async function getByUserId(
  userId: number,
  limit = 20,
  offset = 0
): Promise<{ orders: DbOrder[]; total: number }> {
  try {
    const countResult = await query<{ count: string }>(
      'SELECT COUNT(*) FROM orders WHERE user_id = $1',
      [userId]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await query<DbOrder>(
      `SELECT * FROM orders
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return { orders: result.rows, total };
  } catch (error) {
    console.error('[OrderService] getByUserId error:', (error as Error).message);
    throw error;
  }
}

export async function getById(id: number): Promise<(DbOrder & { telegram_id: number }) | null> {
  try {
    const result = await query<DbOrder & { telegram_id: number }>(
      `SELECT o.*, u.telegram_id 
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('[OrderService] getById error:', (error as Error).message);
    throw error;
  }
}


export async function updateStatus(
  id: number,
  status: string,
  extras?: Partial<Pick<DbOrder, 'error_message' | 'completed_at' | 'payment_id' | 'screenshot_url'>>
): Promise<DbOrder | null> {
  try {
    const setClauses = ['status = $2', 'updated_at = NOW()'];
    const params: unknown[] = [id, status];
    let paramIndex = 3;

    if (extras?.error_message !== undefined) {
      setClauses.push(`error_message = $${paramIndex}`);
      params.push(extras.error_message);
      paramIndex++;
    }

    if (extras?.completed_at !== undefined) {
      setClauses.push(`completed_at = $${paramIndex}`);
      params.push(extras.completed_at);
      paramIndex++;
    }

    if (extras?.payment_id !== undefined) {
      setClauses.push(`payment_id = $${paramIndex}`);
      params.push(extras.payment_id);
      paramIndex++;
    }

    if (extras?.screenshot_url !== undefined) {
      setClauses.push(`screenshot_url = $${paramIndex}`);
      params.push(extras.screenshot_url);
      paramIndex++;
    }

    if (status === 'failed') {
      setClauses.push('retry_count = retry_count + 1');
    }

    const result = await query<DbOrder>(
      `UPDATE orders SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('[OrderService] updateStatus error:', (error as Error).message);
    throw error;
  }
}

export async function getAdminOrders(
  filters: OrderFilters
): Promise<{ orders: DbOrder[]; total: number }> {
  try {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.game) {
      conditions.push(`game = $${paramIndex}`);
      params.push(filters.game);
      paramIndex++;
    }

    if (filters.user_id) {
      conditions.push(`user_id = $${paramIndex}`);
      params.push(filters.user_id);
      paramIndex++;
    }

    if (filters.date_from) {
      conditions.push(`created_at >= $${paramIndex}`);
      params.push(filters.date_from);
      paramIndex++;
    }

    if (filters.date_to) {
      conditions.push(`created_at <= $${paramIndex}`);
      params.push(filters.date_to);
      paramIndex++;
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) FROM orders ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await query<DbOrder>(
      `SELECT o.*, u.telegram_id, u.username as user_username
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return { orders: result.rows, total };
  } catch (error) {
    console.error('[OrderService] getAdminOrders error:', (error as Error).message);
    throw error;
  }
}

export async function getStats(): Promise<DashboardStats> {
  try {
    const revenueResult = await query<{ total: string }>(
      `SELECT COALESCE(SUM(price), 0) as total FROM orders WHERE status = 'completed'`
    );

    const ordersResult = await query<{ total: string; pending: string; completed: string; failed: string }>(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed
       FROM orders`
    );

    const usersResult = await query<{ total: string }>(
      'SELECT COUNT(*) as total FROM users'
    );

    const todayResult = await query<{ revenue: string; orders: string }>(
      `SELECT
        COALESCE(SUM(price), 0) as revenue,
        COUNT(*) as orders
       FROM orders
       WHERE created_at >= CURRENT_DATE AND status = 'completed'`
    );

    return {
      total_revenue: parseFloat(revenueResult.rows[0].total),
      total_orders: parseInt(ordersResult.rows[0].total, 10),
      pending_orders: parseInt(ordersResult.rows[0].pending, 10),
      completed_orders: parseInt(ordersResult.rows[0].completed, 10),
      failed_orders: parseInt(ordersResult.rows[0].failed, 10),
      total_users: parseInt(usersResult.rows[0].total, 10),
      today_revenue: parseFloat(todayResult.rows[0].revenue),
      today_orders: parseInt(todayResult.rows[0].orders, 10),
    };
  } catch (error) {
    console.error('[OrderService] getStats error:', (error as Error).message);
    throw error;
  }
}
