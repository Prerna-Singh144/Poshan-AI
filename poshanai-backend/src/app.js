import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import { rateLimit } from 'express-rate-limit';
import { env } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import mealPlanRoutes from './routes/mealPlanRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import lifestyleRoutes from './routes/lifestyleRoutes.js';
import foodRoutes from './routes/foodRoutes.js';
import logRoutes from './routes/logRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import requestLogger from './middleware/requestLogger.js';
import { getHealthStatus } from './services/healthService.js';
import { RATE_LIMITS } from './config/constants.js';

const app = express();
app.set('trust proxy', 1);
app.use(requestLogger);
const apiLimiter = rateLimit({
  windowMs: RATE_LIMITS.apiWindowMs,
  limit: RATE_LIMITS.apiRequests,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' },
  }),
});

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use('/api', apiLimiter);

app.get('/health', async (_req, res, next) => {
  try {
    const health = await getHealthStatus();
    return res.status(health.status === 'ok' ? 200 : 503).json(health);
  } catch (error) {
    return next(error);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/mealplans', mealPlanRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/lifestyle', lifestyleRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/logs', logRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
