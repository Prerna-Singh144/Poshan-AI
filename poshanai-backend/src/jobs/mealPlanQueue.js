import { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';
import { redisConnection } from './queue.js';

export const mealPlanQueueName = 'meal-plan-generation';
let queue;

function getQueue() {
  if (!queue) {
    queue = new Queue(mealPlanQueueName, {
      connection: redisConnection(1, { connectTimeout: 5000 }),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: { age: 86400, count: 500 },
        removeOnFail: { age: 604800, count: 1000 },
      },
    });
    queue.on('error', () => logger.warn('The meal-plan generation queue is unavailable.'));
  }
  return queue;
}

export async function enqueueMealPlanGeneration({ userId, reportId, preferences = {} }) {
  if (!env.redisUrl) {
    const error = new Error('Meal-plan generation is temporarily unavailable.');
    error.code = 'MEAL_PLAN_QUEUE_UNAVAILABLE';
    throw error;
  }
  const jobId = randomUUID();
  await getQueue().add('generate-meal-plan', {
    userId: String(userId), reportId: String(reportId), preferences,
  }, { jobId });
  return jobId;
}

export async function getMealPlanJob(jobId) {
  return getQueue().getJob(jobId);
}

export async function closeMealPlanQueue() {
  await queue?.close();
  queue = null;
}
