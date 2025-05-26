import type { Server } from 'http';
import helmet from 'helmet';
import { createAdapter } from '@socket.io/redis-streams-adapter';
import { Server as SocketIoServer } from 'socket.io';
import type { ServerConfig } from '../../../common/config/model/ServerConfig.js';
import { log } from '../../../common/util/logger.js';
import { RedisClient } from '../../../common/client/RedisClient.js';
import { SocketRateLimiterMiddleware } from '../../../common/middleware/SocketRateLimiterMiddleware.js';
import { SocketIoBootstrapService } from '../service/SocketIoBoostrapService.js';

const init = async (httpServer: Server, serverConfig: ServerConfig) => {
  const io = new SocketIoServer(httpServer, {
    adapter: createAdapter(RedisClient.get()),
    cors: {
      origin: serverConfig.config.allowedOrigins.split(','),
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.engine.on('connection_error', (err) => {
    log.fatal(
      {
        errCode: err.code,
        errMsg: err.message,
        errContext: err.context,
      },
      '[SocketServer] Socket.io connection error',
    );

    // TODO: Throw error?
  });

  /** Middlewares */
  // Apply helmet to the Socket.IO engine's underlying HTTP server
  io.engine.use(helmet());
  // Apply rate limiting per IP
  io.use(SocketRateLimiterMiddleware.use); // NOTE: This only applies to main namespace ('/'), not to '/video-chat' namespace

  /** Bootstrap */

  await SocketIoBootstrapService.bootstrap(io);
  log.info(
    '[SocketServer] SocketIoBootstrapService bootstrapped successfully.',
  );
};

export const SocketServer = {
  init,
};
