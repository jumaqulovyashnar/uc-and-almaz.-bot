import type { Request } from 'express';

// ── Telegram Types ──
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  is_premium?: boolean;
  language_code?: string;
  photo_url?: string;
}

// ── Database Row Types ──
export interface DbUser {
  id: number;
  telegram_id: number;
  first_name: string;
  last_name: string | null;
  username: string | null;
  is_premium: boolean;
  total_spent: string;
  order_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface DbGamePackage {
  id: number;
  game: string;
  category: string;
  name: string;
  amount: number;
  base_price: string;
  sell_price: string;
  currency: string;
  is_active: boolean;
  discount: number;
  sort_order: number;
  created_at: Date;
}

export interface DbOrder {
  id: number;
  user_id: number;
  game: string;
  category: string;
  package_id: number | null;
  package_name: string;
  amount: number;
  price: string;
  player_id: string;
  player_nickname: string | null;
  status: string;
  payment_method: string | null;
  payment_id: string | null;
  screenshot_url: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: Date;
  completed_at: Date | null;
  updated_at: Date;
}

export interface DbTransaction {
  id: number;
  order_id: number;
  payment_provider: string;
  external_id: string | null;
  amount: string;
  status: string;
  metadata: Record<string, unknown>;
  created_at: Date;
}

export interface DbSystemConfig {
  id: number;
  key: string;
  value: unknown;
  updated_at: Date;
}

// ── Request Types ──
export interface AuthRequest extends Request {
  user?: DbUser;
}

export interface OrderCreateInput {
  game: string;
  category: string;
  package_id: number;
  player_id: string;
  player_nickname?: string;
  payment_method?: string;
}

export interface OrderFilters {
  status?: string;
  game?: string;
  user_id?: number;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

// ── API Response ──
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ── Stats ──
export interface DashboardStats {
  total_revenue: number;
  total_orders: number;
  pending_orders: number;
  completed_orders: number;
  failed_orders: number;
  total_users: number;
  today_revenue: number;
  today_orders: number;
}

// ── Extend Express Request ──
declare global {
  namespace Express {
    interface Request {
      user?: DbUser;
    }
  }
}
