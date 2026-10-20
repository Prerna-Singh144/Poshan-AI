import app from './app.js';
import connectDB from './config/db.js';
import { env } from './config/env.js';
import logger from './utils/logger.js';
import { closeOcrQueue } from './jobs/queue.js';
import { closeHealthRedis } from './services/healthService.js';
import { runAllSweepers } from './jobs/sweeper.js';
import { closeMealPlanQueue } from './jobs/mealPlanQueue.js';

let server;
let shuttingDown = false;
let maintenanceTimer;

async function runMaintenanceSweep() {
  try {
    await runAllSweepers();
  } catch {
    logger.error('Scheduled data-retention sweep failed.');
  }
}

async function startServer() {
  await connectDB();
  void runMaintenanceSweep();
  maintenanceTimer = setInterval(() => void runMaintenanceSweep(), 60 * 60 * 1000);
  maintenanceTimer.unref();
  server = app.listen(env.port, '0.0.0.0', () => {
    logger.info(`PoshanAI API listening on port ${env.port}`);
  });
}

async function shutdown(reason, error) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (maintenanceTimer) clearInterval(maintenanceTimer);
  logger.error(reason, error);

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  await Promise.all([closeOcrQueue(), closeMealPlanQueue(), closeHealthRedis()]);
  process.exit(1);
}

process.on('unhandledRejection', (error) => {
  void shutdown('Unhandled promise rejection', error);
});

process.on('uncaughtException', (error) => {
  void shutdown('Uncaught exception', error);
});

async function gracefulShutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  if (maintenanceTimer) clearInterval(maintenanceTimer);
  if (server) await new Promise((resolve) => server.close(resolve));
  await Promise.all([closeOcrQueue(), closeMealPlanQueue(), closeHealthRedis()]);
  process.exit(0);
}

process.on('SIGTERM', () => {
  void gracefulShutdown();
});

process.on('SIGINT', () => {
  void gracefulShutdown();
});

startServer().catch((error) => {
  logger.error('Backend startup failed', error);
  process.exit(1);
});
