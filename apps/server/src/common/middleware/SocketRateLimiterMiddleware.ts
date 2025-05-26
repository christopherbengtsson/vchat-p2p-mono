import type { Socket } from 'socket.io';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { CustomError, CustomErrorType, type Maybe } from '@mono/common-dto';
import { RedisClient } from '../client/RedisClient.js';
import { log } from '../util/logger.js';

let rateLimiter: Maybe<RateLimiterRedis>;

const getRateLimiter = () => {
  if (!rateLimiter) {
    rateLimiter = new RateLimiterRedis({
      storeClient: RedisClient.get(),
      keyPrefix: 'socket-rate-limit-middleware',
      points: 15, // 15 requests
      duration: 1, // per 1 second by IP
    });
  }
  return rateLimiter;
};

const use = (socket: Socket, next: (err?: CustomError) => void) => {
  getRateLimiter()
    .consume(socket.id) // TODO: or socket.handshake.address?
    .then(() => {
      next();
    })
    .catch(() => {
      log.warn('[io rate limiter]: Too many requests');
      next(
        new CustomError(CustomErrorType.TOO_MANY_REQUESTS, 'Too many requests'),
      );
    });
};

export const SocketRateLimiterMiddleware = {
  use,
};
