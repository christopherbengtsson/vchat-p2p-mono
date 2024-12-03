import 'dotenv/config';
import { collectDefaultMetrics } from 'prom-client';
import { HttpServer } from './HttpServer.js';
import { SocketServer } from './socket/SocketServer.js';
import logger from './utils/logger.js';
import redisClient from './redis/client.js';

collectDefaultMetrics();

const PORT = process.env.PORT || 8000;

await redisClient.connect();

const httpServer = HttpServer.init();

SocketServer.init(httpServer, redisClient);

process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'Uncaught Exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.fatal({ reason, promise }, 'Unhandled Rejection');
});

httpServer.listen(Number(PORT), () => {
  logger.info(`Server is running on port ${PORT}`);
});
