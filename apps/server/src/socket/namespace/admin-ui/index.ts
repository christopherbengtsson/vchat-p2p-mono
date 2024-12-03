import { hostname } from 'os';
import { instrument, RedisStore } from '@socket.io/admin-ui';
import type { Server } from 'socket.io';
import type { Redis } from 'ioredis';
import { MODE } from '../../../model/ServerConstants.js';

const bootstrap = (io: Server, redisClient: Redis) => {
  const adminNamespace = io.of('/admin');
  instrument(io, {
    auth:
      MODE === 'production'
        ? {
            type: 'basic',
            username: process.env.ADMIN_UI_USERNAME ?? '',
            password: process.env.ADMIN_UI_PASSWORD ?? '',
          }
        : false,
    mode: MODE,
    store: new RedisStore(redisClient),
    serverId: `${hostname()}#${process.pid}`,
  });
  adminNamespace.use((_socket, next) => {
    next();
  });
};

export const AdminUiNsp = {
  bootstrap,
};
