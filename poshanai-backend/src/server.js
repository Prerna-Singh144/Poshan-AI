import app from './app.js';
import connectDB from './config/db.js';
import { env } from './config/env.js';
import logger from './utils/logger.js';
import { closeOcrQueue, startOcrWorker } from './services/ocrQueue.js';
import { closeOcrWorker } from './services/ocrService.js';

let server;
let shuttingDown = false;

async function startServer() {
  await connectDB();
  startOcrWorker();
  server = app.listen(env.port, '0.0.0.0', () => {
    logger.info(`PoshanAI API listening on port ${env.port}`);
  });
}

async function shutdown(reason) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.error(reason);

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  await Promise.all([closeOcrQueue(), closeOcrWorker()]);
  process.exit(1);
}

process.on('unhandledRejection', () => {
  void shutdown('Unhandled promise rejection');
});

process.on('uncaughtException', () => {
  void shutdown('Uncaught exception');
});

process.on('SIGTERM', () => {
  if (server) {
    server.close(async () => {
      await Promise.all([closeOcrQueue(), closeOcrWorker()]);
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  if (server) {
    server.close(async () => {
      await Promise.all([closeOcrQueue(), closeOcrWorker()]);
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

startServer().catch(() => {
  logger.error('Backend startup failed');
  process.exit(1);
});
