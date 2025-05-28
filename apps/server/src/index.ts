import 'dotenv/config';
import { log } from './common/util/logger.js';
import { gracefulShutdown, start } from './main.js';

start().catch((error) => {
  log.fatal({ error }, 'Server failed to start');
  process.exit(1);
});

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGQUIT', () => gracefulShutdown('SIGQUIT'));

process.on('uncaughtException', (error) => {
  log.fatal({ error }, 'Uncaught Exception. Shutting down...');
  // Attempt a graceful shutdown if possible, otherwise force exit after a timeout
  gracefulShutdown('uncaughtException')
    .catch(() => {
      log.error('Graceful shutdown during uncaughtException failed.');
    })
    .finally(() => {
      process.exit(1);
    });
});

process.on('unhandledRejection', (reason, promise) => {
  log.fatal({ reason, promise }, 'Unhandled Rejection. Shutting down...');
  // Attempt a graceful shutdown if possible, otherwise force exit after a timeout
  gracefulShutdown('unhandledRejection')
    .catch(() => {
      log.error('Graceful shutdown during unhandledRejection failed.');
    })
    .finally(() => {
      process.exit(1);
    });
});
