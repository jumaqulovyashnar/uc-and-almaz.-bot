import type { Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { AppError } from './errorHandler.js';
import { createOrUpdate } from '../services/user.service.js';
import type { AuthRequest, TelegramUser } from '../types/index.js';

function validateTelegramData(initData: string): TelegramUser | null {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');

    if (!hash) {
      return null;
    }

    // Remove hash from params and sort alphabetically
    urlParams.delete('hash');
    const dataCheckArr: string[] = [];
    urlParams.sort();
    urlParams.forEach((value, key) => {
      dataCheckArr.push(`${key}=${value}`);
    });
    const dataCheckString = dataCheckArr.join('\n');

    // Compute HMAC-SHA256
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(env.BOT_TOKEN)
      .digest();

    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (computedHash !== hash) {
      return null;
    }

    // Extract user
    const userStr = urlParams.get('user');
    if (!userStr) {
      return null;
    }

    const user = JSON.parse(userStr) as TelegramUser;
    return user;
  } catch (error) {
    console.error('[TelegramAuth] Validation error:', (error as Error).message);
    return null;
  }
}

export async function telegramAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const initData = req.headers['x-telegram-init-data'] as string | undefined;

    if (!initData) {
      throw new AppError('Missing Telegram initData', 401);
    }

    const telegramUser = validateTelegramData(initData);

    if (!telegramUser) {
      // In development, allow bypassing with a mock user header
      if (env.NODE_ENV === 'development' && req.headers['x-dev-user-id']) {
        const devUserId = parseInt(req.headers['x-dev-user-id'] as string, 10);
        const dbUser = await createOrUpdate({
          id: devUserId,
          first_name: 'Dev',
          last_name: 'User',
          username: 'devuser',
        });
        req.user = dbUser;
        next();
        return;
      }

      throw new AppError('Invalid Telegram initData', 401);
    }

    // Upsert user in database
    const dbUser = await createOrUpdate({
      id: telegramUser.id,
      first_name: telegramUser.first_name,
      last_name: telegramUser.last_name,
      username: telegramUser.username,
      is_premium: telegramUser.is_premium,
    });

    req.user = dbUser;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Authentication failed', 401));
    }
  }
}

export { validateTelegramData };
