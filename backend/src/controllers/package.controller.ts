import type { Request, Response, NextFunction } from 'express';
import { getByGame } from '../services/package.service.js';
import { AppError } from '../middleware/errorHandler.js';

export async function getPackages(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { game } = req.params;
    const category = req.params.category as string | undefined;

    if (!game || !['pubg', 'freefire'].includes(game)) {
      throw new AppError('Invalid game. Must be "pubg" or "freefire"', 400);
    }

    const packages = await getByGame(game, category);

    // Group by category if no specific category requested
    if (!category) {
      const grouped: Record<string, typeof packages> = {};
      for (const pkg of packages) {
        if (!grouped[pkg.category]) {
          grouped[pkg.category] = [];
        }
        grouped[pkg.category].push(pkg);
      }

      res.json({
        success: true,
        data: { game, packages: grouped },
      });
      return;
    }

    res.json({
      success: true,
      data: { game, category, packages },
    });
  } catch (error) {
    next(error);
  }
}
