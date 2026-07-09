import { query } from '../config/database.js';
import type { DbUser, TelegramUser } from '../types/index.js';

export async function findByTelegramId(telegramId: number): Promise<DbUser | null> {
  try {
    const result = await query<DbUser>(
      'SELECT * FROM users WHERE telegram_id = $1',
      [telegramId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('[UserService] findByTelegramId error:', (error as Error).message);
    throw error;
  }
}

export async function createOrUpdate(userData: TelegramUser): Promise<DbUser> {
  try {
    const result = await query<DbUser>(
      `INSERT INTO users (telegram_id, first_name, last_name, username, is_premium)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (telegram_id) DO UPDATE SET
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         username = EXCLUDED.username,
         is_premium = EXCLUDED.is_premium,
         updated_at = NOW()
       RETURNING *`,
      [
        userData.id,
        userData.first_name,
        userData.last_name || null,
        userData.username || null,
        userData.is_premium || false,
      ]
    );
    return result.rows[0];
  } catch (error) {
    console.error('[UserService] createOrUpdate error:', (error as Error).message);
    throw error;
  }
}

export async function updateSpending(userId: number, amount: number): Promise<void> {
  try {
    await query(
      `UPDATE users SET
        total_spent = total_spent + $1,
        order_count = order_count + 1,
        updated_at = NOW()
       WHERE id = $2`,
      [amount, userId]
    );
  } catch (error) {
    console.error('[UserService] updateSpending error:', (error as Error).message);
    throw error;
  }
}
