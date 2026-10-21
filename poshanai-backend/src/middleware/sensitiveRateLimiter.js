import Redis from 'ioredis';
import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';

let redisClient;

function getRedisClient() {
  if (!redisClient) {
    redisClient = new Redis(env.redisUrl, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 1000,
      retryStrategy: (attempt) => Math.min(attempt * 100, 3000),
    });
    redisClient.on('error', () => {});
  }
  return redisClient;
}

class RedisWindowStore {
  constructor(prefix) {
    this.prefix = `poshanai:ratelimit:${prefix}:`;
  }

  init({ windowMs }) {
    this.windowMs = windowMs;
  }

  async increment(key) {
    const script = [
      "local count = redis.call('INCR', KEYS[1])",
      "if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end",
      "return { count, redis.call('PTTL', KEYS[1]) }",
    ].join('\n');

    try {
      const [totalHits, ttl] = await getRedisClient().eval(
        script,
        1,
        `${this.prefix}${key}`,
        this.windowMs,
      );
      return {
        totalHits: Number(totalHits),
        resetTime: new Date(Date.now() + Math.max(Number(ttl), 0)),
      };
    } catch {
      const error = new Error('Request protection is temporarily unavailable. Please try again.');
      error.statusCode = 503;
      error.code = 'RATE_LIMIT_STORE_UNAVAILABLE';
      throw error;
    }
  }

  async decrement(key) {
    await getRedisClient().decr(`${this.prefix}${key}`);
  }

  async resetKey(key) {
    await getRedisClient().del(`${this.prefix}${key}`);
  }
}

export function sensitiveRateLimiter({ name, windowMs, limit }) {
  if (env.nodeEnv === 'test') return (_req, _res, next) => next();

  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    store: env.redisUrl ? new RedisWindowStore(name) : undefined,
    keyGenerator: (req) => req.user?._id
      ? `user:${req.user._id}`
      : `ip:${req.ip}`,
    handler: (_req, res) => res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' },
    }),
  });
}
