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

  const httpServer = HttpServer.init();

  await SocketServer.init(httpServer, serverConfig);

  await JobManagerService.startAllJobs();

  JobManagerService.startPeriodicCleanup(serverConfig);

  const port = serverConfig.config.port;
  httpServer.listen(port, () => {
    log.info(`Server is running on port ${port}`);
  });
};

export const gracefulShutdown = async (signal: string) => {
  log.info(
    { signal },
    `[main] Received ${signal}. Starting graceful shutdown...`,
  );

  JobManagerService.stopPeriodicCleanup();

  await JobManagerService.destroyAllJobs();

  await RedisClient._redisClientInstance?.quit();

  log.info('[main] Graceful shutdown completed. Exiting.');
  process.exit(0);
};
