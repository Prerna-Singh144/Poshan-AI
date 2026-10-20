import 'dotenv/config';
import { createHash, createHmac } from 'node:crypto';
import logger from '../utils/logger.js';

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

const nodeEnv = process.env.NODE_ENV ?? 'development';
const redisUrl = process.env.REDIS_URL ?? null;
if (nodeEnv === 'production' && !redisUrl) {
  throw new Error('REDIS_URL is required in production for distributed rate limits and background jobs.');
}
const mongoTlsOverride = process.env.MONGODB_TLS;
const mongoHost = (() => {
  try {
    return new URL(process.env.MONGODB_URI.replace(/^mongodb(\+srv)?:\/\//, 'http://')).hostname;
  } catch {
    return '';
  }
})();
const isLocalMongo = ['localhost', '127.0.0.1', '::1', 'mongo'].includes(mongoHost);
const mongoTls = mongoTlsOverride === undefined
  ? nodeEnv === 'production' && !isLocalMongo
  : mongoTlsOverride.toLowerCase() === 'true';
if (mongoTlsOverride !== undefined && !['true', 'false'].includes(mongoTlsOverride.toLowerCase())) {
  throw new Error('MONGODB_TLS must be true or false.');
}
if (nodeEnv === 'production' && !isLocalMongo && !mongoTls) {
  throw new Error('MONGODB_TLS=true is required for production MongoDB connections.');
}
const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? (nodeEnv === 'production' ? 1 : 0));
if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0 || trustProxyHops > 10) {
  throw new Error('TRUST_PROXY_HOPS must be an integer between 0 and 10.');
}
const storageType = process.env.STORAGE_TYPE ?? (nodeEnv === 'production' ? 's3' : 'local');
if (!['local', 's3'].includes(storageType)) {
  throw new Error('STORAGE_TYPE must be either local or s3.');
}
if (storageType === 's3' && (!process.env.S3_BUCKET || !process.env.S3_REGION)) {
  throw new Error('S3_BUCKET and S3_REGION are required when STORAGE_TYPE=s3.');
}
if (Boolean(process.env.S3_ACCESS_KEY) !== Boolean(process.env.S3_SECRET_KEY)) {
  throw new Error('Set both S3_ACCESS_KEY and S3_SECRET_KEY, or use the AWS default credential provider.');
}
const placeholderSecrets = new Set(['CHANGEME', 'your_secret_here']);
const jwtSecretIssues = [];
for (const [name, secret] of [
  ['JWT_ACCESS_SECRET', accessSecret],
  ['JWT_REFRESH_SECRET', refreshSecret],
]) {
  if (secret.length < 32) jwtSecretIssues.push(`${name} must be at least 32 characters.`);
  if (placeholderSecrets.has(secret)) jwtSecretIssues.push(`${name} must not use a placeholder value.`);
}
if (accessSecret === refreshSecret) {
  jwtSecretIssues.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different.');
}
if (jwtSecretIssues.length > 0) {
  const message = `Invalid JWT secret configuration: ${jwtSecretIssues.join(' ')}`;
  if (nodeEnv === 'production') throw new Error(message);
  logger.warn(message);
}

const encryptionKey = process.env.ENCRYPTION_KEY ?? createHash('sha256').update(accessSecret).digest('base64');
const signingKey = process.env.SIGNING_KEY ?? createHmac('sha512', accessSecret).update('poshanai-signing').digest('base64');

export const env = {
  nodeEnv,
  port: Number(process.env.PORT ?? 5000),
  trustProxyHops,
  clientOrigin: process.env.CLIENT_URL ?? process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI,
  mongoTls,
  redisUrl,
  storageType,
  s3Bucket: process.env.S3_BUCKET ?? null,
  s3Region: process.env.S3_REGION ?? null,
  s3AccessKey: process.env.S3_ACCESS_KEY ?? null,
  s3SecretKey: process.env.S3_SECRET_KEY ?? null,
  s3KmsKeyId: process.env.S3_KMS_KEY_ID ?? null,
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
  reportRetentionDays: Number(process.env.REPORT_RETENTION_DAYS ?? 365),
  encryptionKey,
  signingKey,
};
