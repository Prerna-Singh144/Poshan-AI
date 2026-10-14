import 'dotenv/config';

const required = ['MONGODB_URI'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
}

const sharedJwtSecret = process.env.JWT_SECRET;
const accessSecret = process.env.JWT_ACCESS_SECRET ?? sharedJwtSecret;
const refreshSecret = process.env.JWT_REFRESH_SECRET ?? sharedJwtSecret;
if (!accessSecret || !refreshSecret) {
  throw new Error('Set JWT_SECRET or both JWT_ACCESS_SECRET and JWT_REFRESH_SECRET.');
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 5000),
  clientOrigin: process.env.CLIENT_URL ?? process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI,
  redisUrl: process.env.REDIS_URL ?? null,
  omniRouteUrl: process.env.OMNIROUTE_URL ?? 'http://localhost:20128/v1/chat/completions',
  omniRouteModel: process.env.OMNIROUTE_MODEL ?? 'gemini-2.0-flash',
  omniRouteApiKey: process.env.OMNIROUTE_API_KEY ?? null,
  jwtAccessSecret: accessSecret,
  jwtRefreshSecret: refreshSecret,
  jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY ?? '15m',
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY ?? '7d',
  refreshCookieName: 'refreshToken',
  refreshCookiePresenceName: 'refreshTokenPresent',
  isProduction: process.env.NODE_ENV === 'production',
};
