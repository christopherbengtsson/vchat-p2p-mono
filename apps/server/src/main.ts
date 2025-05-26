import { log } from './common/util/logger.js';
import { HttpServer } from './HttpServer.js';
import { ServerConfigService } from './common/config/service/ServerConfigService.js';
import { BootstrapService } from './feature/bootstrap/service/BootstrapService.js';
import { SocketServer } from './feature/socket-io/server/SocketServer.js';
import { JobManagerService } from './feature/job/service/JobManagerService.js';
import { RedisClient } from './common/client/RedisClient.js';

export const start = async () => {
  await BootstrapService.init();

  const serverConfig = ServerConfigService.getConfig();

  const httpServer = HttpServer.init(serverConfig);

  await SocketServer.init(httpServer, serverConfig);

  await JobManagerService.startAllJobs();

  JobManagerService.startPeriodicCleanup(serverConfig);

  const port = serverConfig.config.port;
  httpServer.listen(port, () => {
    log.info({ port }, `Server is running on port ${port}`);
  });
};

export const gracefulShutdown = async (signal: string) => {
  log.info(
    { signal },
    `[main] Received ${signal}. Starting graceful shutdown...`,
  );

  JobManagerService.stopPeriodicCleanup();
  log.info('[main] Queue job periodic cleanup task stopped.');

  await JobManagerService.destroyAllJobs();
  log.info('[main] All queue jobs destroyed.');

  await RedisClient._redisClientInstance?.quit();
  log.info('[main] Redis client connection closed.');

  log.info('[main] Graceful shutdown completed. Exiting.');
  process.exit(0);
};
