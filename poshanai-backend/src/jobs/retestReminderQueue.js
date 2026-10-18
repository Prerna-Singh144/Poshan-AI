import { Queue } from 'bullmq';
import { RETEST_REMINDER_SETTINGS } from '../config/constants.js';
import { redisConnection } from './queue.js';

let queue;

export function getRetestReminderQueue() {
  if (!queue) {
    queue = new Queue(RETEST_REMINDER_SETTINGS.queueName, {
      connection: redisConnection(1),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
  }
  return queue;
}

export async function scheduleRetestReminderSweep() {
  return getRetestReminderQueue().add(
    'check-retest-reminders',
    {},
    {
      jobId: 'daily-retest-reminder-sweep',
      repeat: { pattern: RETEST_REMINDER_SETTINGS.schedule, tz: RETEST_REMINDER_SETTINGS.timezone },
    },
  );
}

export async function closeRetestReminderQueue() {
  await queue?.close();
  queue = null;
}
