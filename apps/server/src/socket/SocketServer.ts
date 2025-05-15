import type { Server } from 'http';
import helmet from 'helmet';
import { createAdapter } from '@socket.io/redis-streams-adapter';
import { Server as SocketIoServer } from 'socket.io';
import type { Redis } from 'ioredis';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { CustomError, CustomErrorType } from '@mono/common-dto';
import { logger } from '../utils/logger.js';
import { WaitingQueueService } from '../service/WaitingQueueService.js';
import { MatchmakingProcessor } from '../service/MatchmakingProcessor.js';
import { VideoNsp } from './namespace/video-nsp/index.js';

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

  const rateLimiter = new RateLimiterRedis({
    keyPrefix: 'socket-rate-limit-middleware',
    storeClient: redisClient,
    points: 15, // 15 requests
    duration: 1, // per 1 second by IP
  });

  io.use((socket, next) => {
    rateLimiter
      .consume(socket.id) // TODO: or socket.handshake.address?
      .then(() => {
        next();
      })
      .catch(() => {
        logger.warn('[io rate limiter]: Too many requests');
        next(
          new CustomError(
            CustomErrorType.TOO_MANY_REQUESTS,
            'Too many requests',
          ),
        );
      });
  });

  // Initialize services
  const waitingQueueService = new WaitingQueueService(redisClient);
  const matchmakingProcessor = new MatchmakingProcessor(
    waitingQueueService,
    io,
  );

  // Start the processor
  matchmakingProcessor.start();

  // Graceful shutdown
  process.on('SIGTERM', () => {
    matchmakingProcessor.stop();
  });

  VideoNsp.bootstrap(io, redisClient);
};

export const SocketServer = {
  init,
};
