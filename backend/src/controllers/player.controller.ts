import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.js';

const verifyPlayerSchema = z.object({
  game: z.enum(['pubg', 'freefire']),
  player_id: z.string().min(1).max(50),
}).superRefine((data, ctx) => {
  if (data.game === 'pubg') {
    const pubgRegex = /^\d{5,12}$/;
    if (!pubgRegex.test(data.player_id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "PUBG Player ID faqat 5-12 ta raqamdan iborat bo'lishi kerak",
        path: ['player_id'],
      });
    }
  } else if (data.game === 'freefire') {
    const ffRegex = /^\d{8,12}$/;
    if (!ffRegex.test(data.player_id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Free Fire Player ID faqat 8-12 ta raqamdan iborat bo'lishi kerak",
        path: ['player_id'],
      });
    }
  }
});


export async function verifyPlayer(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = verifyPlayerSchema.parse(req.body);

    // Mock verification — placeholder for real API integration
    const last4 = input.player_id.slice(-4);
    const gameName = input.game === 'pubg' ? 'PUBG' : 'FF';

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Simulate occasional invalid IDs
    if (input.player_id.length < 5) {
      throw new AppError('Player not found. Please check your ID.', 404);
    }

    res.json({
      success: true,
      data: {
        valid: true,
        player_id: input.player_id,
        nickname: `${gameName}Player_${last4}`,
        game: input.game,
      },
    });
  } catch (error) {
    next(error);
  }
}
