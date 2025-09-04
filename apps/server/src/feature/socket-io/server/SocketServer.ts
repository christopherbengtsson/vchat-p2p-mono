import type { TemplatedApp } from 'uWebSockets.js';
// import helmet from 'helmet';
import { createAdapter } from '@socket.io/redis-streams-adapter';
import { Server as SocketIoServer } from 'socket.io';
import { CustomError, type Maybe } from '@mono/common-dto';
import { log } from '../../../common/util/logger.js';
import { RedisClient } from '../../../common/client/RedisClient.js';
import { SocketIoBootstrapService } from '../service/SocketIoBoostrapService.js';

let _io: Maybe<SocketIoServer>;

const init = async (uApp: TemplatedApp) => {
  const io = new SocketIoServer({
    adapter: createAdapter(RedisClient.get()),
  });

  io.attachApp(uApp);

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
