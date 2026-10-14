import Redis from 'ioredis';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { redisConnection } from '../jobs/queue.js';
import logger from '../utils/logger.js';

let healthRedis;

function getHealthRedis() {
  if (!env.redisUrl) return null;
  if (!healthRedis || healthRedis.status === 'end') {
    healthRedis = new Redis(redisConnection(1, {
      lazyConnect: true,
      connectTimeout: 1000,
      commandTimeout: 1500,
      retryStrategy: () => null,
    }));
    healthRedis.on('error', (error) => logger.error('Redis health check failed.', error));
  }
  return healthRedis;
}

async function checkMongo() {
  try {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) return false;
    await mongoose.connection.db.command(
      { ping: 1 },
      { maxTimeMS: 1500, serverSelectionTimeoutMS: 1500 },
    );
    return true;
  } catch {
    return false;
  }
}

async function checkRedis() {
  try {
    const client = getHealthRedis();
    return Boolean(client && (await client.ping()) === 'PONG');
  } catch {
    return false;
  }
}

export async function getHealthStatus() {
  const [mongo, redis] = await Promise.all([checkMongo(), checkRedis()]);
  return {
    status: mongo && redis ? 'ok' : 'degraded',
    checks: { mongo, redis, uptime: process.uptime() },
  };
}

export async function closeHealthRedis() {
  healthRedis?.disconnect();
  healthRedis = null;
}
