import type { Socket } from 'socket.io';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { CustomError, type Maybe } from '@mono/common-dto';
import type { JwtPayload } from 'jsonwebtoken';
import { RedisClient } from '../client/RedisClient.js';
import { log } from '../util/logger.js';
import type { IncomingMessage } from './model/IncomingMessage.js';

let rateLimiter: Maybe<RateLimiterRedis>;

const getRateLimiter = () => {
  if (!rateLimiter) {
    const isDevelopment = process.env.NODE_ENV === 'development';

    rateLimiter = new RateLimiterRedis({
      storeClient: RedisClient.get(),
      keyPrefix: 'socket-rate-limit-middleware',
      points: isDevelopment ? 100 : 50,
      duration: 60, // per minute
    });
  }
  return rateLimiter;
};

const use = (socket: Socket, next: (err?: CustomError) => void) => {
  const user = (socket.request as IncomingMessage).user as
    | JwtPayload
    | undefined;

  const userId = user?.sub;
  const rateLimitKey = userId || socket.id;

  getRateLimiter()
    .consume(rateLimitKey)
    .then(() => {
      next();
    })
    .catch(() => {
      log.warn('[io rate limiter]: Too many requests for key:', rateLimitKey);
      next(CustomError.tooManyRequests('Too many requests'));
    });
};

export const SocketRateLimiterMiddleware = {
  use,
};
