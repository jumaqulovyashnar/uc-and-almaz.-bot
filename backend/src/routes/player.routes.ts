import { Router } from 'express';
import { verifyPlayer } from '../controllers/player.controller.js';

const router = Router();

router.post('/', verifyPlayer);

export default router;
