import type { Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { AppError } from './errorHandler.js';
import type { AuthRequest } from '../types/index.js';

export function adminAuth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const adminId = parseInt(env.ADMIN_TELEGRAM_ID, 10);

    if (req.user.telegram_id !== adminId) {
      throw new AppError('Admin access required', 403);
    }

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Authorization failed', 403));
    }
  }
}
