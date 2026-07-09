import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { createOrUpdate } from '../services/user.service.js';
import type { TelegramUser } from '../types/index.js';

export async function telegramAuthHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { initData } = req.body as { initData?: string };

    if (!initData) {
      throw new AppError('initData is required', 400);
    }

    // Parse and validate initData
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');

    if (!hash) {
      throw new AppError('Invalid initData: missing hash', 401);
    }

    // Build data check string
    urlParams.delete('hash');
    const dataCheckArr: string[] = [];
    urlParams.sort();
    urlParams.forEach((value, key) => {
      dataCheckArr.push(`${key}=${value}`);
    });
    const dataCheckString = dataCheckArr.join('\n');

    // Compute HMAC
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(env.BOT_TOKEN)
      .digest();

    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (computedHash !== hash) {
      // Allow dev bypass
      if (env.NODE_ENV === 'development') {
        console.warn('[Auth] Hash mismatch in dev mode, checking for dev user...');
        const userStr = urlParams.get('user');
        if (userStr) {
          const telegramUser = JSON.parse(userStr) as TelegramUser;
          const dbUser = await createOrUpdate(telegramUser);
          res.json({ success: true, data: { user: dbUser } });
          return;
        }
      }
      throw new AppError('Invalid initData signature', 401);
    }

    // Extract user
    const userStr = urlParams.get('user');
    if (!userStr) {
      throw new AppError('Invalid initData: missing user', 401);
    }

    const telegramUser = JSON.parse(userStr) as TelegramUser;

    // Upsert user in database
    const dbUser = await createOrUpdate(telegramUser);

    res.json({
      success: true,
      data: { user: dbUser },
    });
  } catch (error) {
    next(error);
  }
}
