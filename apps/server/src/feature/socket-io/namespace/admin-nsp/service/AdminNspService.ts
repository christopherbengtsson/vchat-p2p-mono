import { hostname } from 'os';
import { instrument, RedisStore } from '@socket.io/admin-ui';
import type { Server } from 'socket.io';
import { SocketNamespace } from '@mono/common-dto';
import type { ServerConfig } from '../../../../../common/config/model/ServerConfig.js';
import { RedisClient } from '../../../../../common/client/RedisClient.js';
import { SocketRateLimiterMiddleware } from '../../../../../common/middleware/SocketRateLimiterMiddleware.js';
import type { RateLimitOptions } from '../../../../../common/middleware/model/RateLimitOptions.js';

const rateLimitOptions: RateLimitOptions = {
  points: process.env.NODE_ENV === 'development' ? 60 : 30,
  duration: 60,
  blockDuration: 600,
  keyPrefix: 'admin-ui-namespace',
  execEvenly: process.env.NODE_ENV === 'production',
};

const bootstrap = (io: Server, serverConfig: ServerConfig) => {
  const adminNamespace = io.of(SocketNamespace.ADMIN_UI);
  const mode = serverConfig.config.env;
  instrument(io, {
    auth:
      mode === 'production'
        ? {
            type: 'basic',
            username: serverConfig.secrets.socketIo.adminUiUsername,
            password: serverConfig.secrets.socketIo.adminUiPassword,
          }
        : false,
    mode: mode === 'production' ? 'production' : 'development',
    store: new RedisStore(RedisClient.get()),
    serverId: `${hostname()}#${process.pid}`,
  });

  adminNamespace.use(SocketRateLimiterMiddleware.use(rateLimitOptions));
  adminNamespace.use((_socket, next) => {
    next();
  });
};

export const AdminNspService = {
  bootstrap,
};
