import 'dotenv/config';
import { createServer } from './server.js';
import { setupSocketServer } from './socket/setupSocketServer.js';
import logger from './utils/logger.js';
import redisClient from './redis/client.js';

const PORT = process.env.PORT || 8000;

await redisClient.connect();

const httpServer = createServer();
setupSocketServer(httpServer, redisClient);

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
