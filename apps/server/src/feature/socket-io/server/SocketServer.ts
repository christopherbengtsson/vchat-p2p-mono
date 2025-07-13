import type { Server } from 'http';
import helmet from 'helmet';
import { createAdapter } from '@socket.io/redis-streams-adapter';
import { Server as SocketIoServer } from 'socket.io';
import { CustomError, type Maybe } from '@mono/common-dto';
import type { ServerConfig } from '../../../common/config/model/ServerConfig.js';
import { log } from '../../../common/util/logger.js';
import { RedisClient } from '../../../common/client/RedisClient.js';
import { SocketIoBootstrapService } from '../service/SocketIoBoostrapService.js';

let _io: Maybe<SocketIoServer>;

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
  });

  /** Middlewares */
  // Apply helmet to the Socket.IO engine's underlying HTTP server
  io.engine.use(helmet());

  /** Bootstrap */
  await SocketIoBootstrapService.bootstrap(io);

  _io = io;
};

export const SocketServer = {
  init,

  get io() {
    if (!_io) {
      throw CustomError.badState('Socket.io server is not initialized');
    }

    return _io;
  },
};
