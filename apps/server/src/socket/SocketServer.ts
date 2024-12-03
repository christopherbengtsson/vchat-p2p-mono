import type { Server } from 'http';
import helmet from 'helmet';
import { createAdapter } from '@socket.io/redis-streams-adapter';
import { Server as SocketIoServer } from 'socket.io';
import type { Redis } from 'ioredis';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import logger from '../utils/logger.js';
import { VideoNsp } from './namespace/video-nsp/index.js';
import { AdminUiNsp } from './namespace/admin-ui/index.js';

const init = (httpServer: Server, redisClient: Redis) => {
  const io = new SocketIoServer(httpServer, {
    adapter: createAdapter(redisClient),
    cors: {
      origin: (process.env.CORS_ORIGINS ?? '').split(','),
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });
  io.engine.on('connection_error', (error) => {
    logger.fatal(error, 'Socket.io connection error');
  });

  io.engine.use(helmet());

  const rateLimiter = new RateLimiterMemory({
    points: 15,
    duration: 1,
  });
  io.use((socket, next) => {
    rateLimiter
      .consume(socket.id) // TODO: or socket.handshake.address?
      .then(() => {
        next();
      })
      .catch(() => {
        logger.warn('[io rate limiter]: Too many requests');
        next(new Error('Too many requests'));
      });
  });

  AdminUiNsp.bootstrap(io, redisClient);
  VideoNsp.bootstrap(io, redisClient);
};

export const SocketServer = {
  init,
};
