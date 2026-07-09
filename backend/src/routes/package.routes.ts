import { Router } from 'express';
import { getPackages } from '../controllers/package.controller.js';

const router = Router();

router.get('/:game', getPackages);
router.get('/:game/:category', getPackages);

export default router;
