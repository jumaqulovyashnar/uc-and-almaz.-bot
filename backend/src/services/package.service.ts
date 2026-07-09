import { query } from '../config/database.js';
import type { DbGamePackage } from '../types/index.js';

export async function getByGame(
  game: string,
  category?: string
): Promise<DbGamePackage[]> {
  try {
    if (category) {
      const result = await query<DbGamePackage>(
        `SELECT * FROM game_packages
         WHERE game = $1 AND category = $2 AND is_active = TRUE
         ORDER BY sort_order ASC`,
        [game, category]
      );
      return result.rows;
    }

    const result = await query<DbGamePackage>(
      `SELECT * FROM game_packages
       WHERE game = $1 AND is_active = TRUE
       ORDER BY category, sort_order ASC`,
      [game]
    );
    return result.rows;
  } catch (error) {
    console.error('[PackageService] getByGame error:', (error as Error).message);
    throw error;
  }
}

export async function getById(id: number): Promise<DbGamePackage | null> {
  try {
    const result = await query<DbGamePackage>(
      'SELECT * FROM game_packages WHERE id = $1 AND is_active = TRUE',
      [id]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('[PackageService] getById error:', (error as Error).message);
    throw error;
  }
}

export async function getAll(): Promise<DbGamePackage[]> {
  try {
    const result = await query<DbGamePackage>(
      'SELECT * FROM game_packages ORDER BY game, category, sort_order ASC'
    );
    return result.rows;
  } catch (error) {
    console.error('[PackageService] getAll error:', (error as Error).message);
    throw error;
  }
}
