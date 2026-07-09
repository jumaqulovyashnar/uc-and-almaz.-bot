import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes.js';
import packageRoutes from './routes/package.routes.js';
import orderRoutes from './routes/order.routes.js';
import playerRoutes from './routes/player.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Apply global middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/verify-player', playerRoutes);
app.use('/api/admin', adminRoutes);

// Base route for sanity check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'CyberPay API is healthy' });
});

// Error handling middleware
app.use(errorHandler);

export default app;
export { app };
