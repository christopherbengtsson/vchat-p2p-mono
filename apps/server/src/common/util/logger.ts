import { pino } from 'pino';

export const log = pino({
  level: process.env.PINO_LOG_LEVEL || 'info', // gets overwritten in bootstrap on startup
});
