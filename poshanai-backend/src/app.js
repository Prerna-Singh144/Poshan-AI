import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import { rateLimit } from 'express-rate-limit';
import { env } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import otpRoutes from './routes/otpRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import mealPlanRoutes from './routes/mealPlanRoutes.js';
import dietPlanRoutes from './routes/dietPlanRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

// Import all routes (Combined from both branches)
import lifestyleRoutes from './routes/lifestyleRoutes.js';
import foodRoutes from './routes/foodRoutes.js';
import logRoutes from './routes/logRoutes.js';
import calorieRoutes from './routes/calorieRoutes.js';
import dailyLogRoutes from './routes/dailyLogRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import supplementRoutes from './routes/supplementRoutes.js';
import expertRoutes from './routes/expertRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import requestLogger from './middleware/requestLogger.js';
import { getHealthStatus } from './services/healthService.js';
import { RATE_LIMITS } from './config/constants.js';

const app = express();
const loopbackHosts = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

function isAllowedOrigin(origin) {
  if (origin === env.clientOrigin) return true;
  if (env.isProduction || !origin) return false;

  try {
    const requested = new URL(origin);
    const configured = new URL(env.clientOrigin);
    return requested.protocol === configured.protocol
      && requested.port === configured.port
      && loopbackHosts.has(requested.hostname)
      && loopbackHosts.has(configured.hostname);
  } catch {
    return false;
  }
}

// Trust only the explicitly configured proxy chain. Local direct requests must
// not be able to choose their rate-limit identity with X-Forwarded-For.
app.set('trust proxy', env.trustProxyHops);
app.use(requestLogger);

const apiLimiter = process.env.NODE_ENV === 'test'
  ? (_req, _res, next) => next()
  : rateLimit({
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
app.use(helmet({ frameguard: { action: 'deny' } }));
app.use(cors({
  origin: (origin, callback) => callback(null, isAllowedOrigin(origin) ? origin : false),
  credentials: true,
}));
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use('/api', apiLimiter);

// Public liveness/readiness probe; it returns service status only.
app.get('/health', async (_req, res, next) => {
  try {
    const health = await getHealthStatus();
    return res.status(health.status === 'ok' || health.status === 'degraded' ? 200 : 503).json(health);
  } catch (error) {
    return next(error);
  }
});

const apiRoutes = [
  ['/auth', authRoutes],
  ['/auth/otp', otpRoutes],
  ['/reports', reportRoutes],
  ['/mealplans', mealPlanRoutes],
  ['/diet-plans', dietPlanRoutes],
  ['/users', userRoutes],
  ['/admin', adminRoutes],
  ['/lifestyle', lifestyleRoutes],
  ['/foods', foodRoutes],
  ['/calories', calorieRoutes],
  ['/notifications', notificationRoutes],
  ['/supplements', supplementRoutes],
  ['/experts', expertRoutes],
  ['/logs', logRoutes],
  ['/logs', dailyLogRoutes],
  ['/daily-logs', dailyLogRoutes],
];

// /api/v1 is canonical. Keep /api as a compatibility alias for existing clients.
for (const [path, router] of apiRoutes) {
  app.use(`/api/v1${path}`, router);
  app.use(`/api${path}`, router);
}

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
