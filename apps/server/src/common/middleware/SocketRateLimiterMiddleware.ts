import type { Socket } from 'socket.io';
import { RateLimiterRedis, type IRateLimiterRes } from 'rate-limiter-flexible';
import { CustomError, type Maybe } from '@mono/common-dto';
import type { JwtPayload } from 'jsonwebtoken';
import { RedisClient } from '../client/RedisClient.js';
import { log } from '../util/logger.js';
import { HeadersUtil } from '../util/HeadersUtil.js';
import type { IncomingMessage } from './model/IncomingMessage.js';
import type { RateLimitOptions } from './model/RateLimitOptions.js';

const isDevelopment = process.env.NODE_ENV === 'development';
let rateLimiter: Maybe<RateLimiterRedis>;

const getRateLimiter = (rateLimiterOptions: Maybe<RateLimitOptions>) => {
  if (!rateLimiter) {
    rateLimiter = new RateLimiterRedis({
      keyPrefix: 'socket-rate-limit-middleware',
      points: isDevelopment ? 100 : 50,
      duration: 60, // per minute
      ...rateLimiterOptions,
      storeClient: RedisClient.get(),
    });
  }
  return rateLimiter;
};

const use =
  (rateLimiterOptions?: RateLimitOptions) =>
  (socket: Socket, next: (err?: CustomError) => void) => {
    const user = (socket.request as IncomingMessage).user as
      | JwtPayload
      | undefined;

    const userId = user?.sub;

    const rateLimitKey =
      userId ||
      HeadersUtil.extractIpFromHeaders(socket.request.headers) ||
      socket.id ||
      socket.request.socket?.remoteAddress ||
      'unknown';

    getRateLimiter(rateLimiterOptions)
      .consume(rateLimitKey)
      .then(() => {
        next();
      })
      .catch((rejRes: IRateLimiterRes) => {
        log.warn(
          {
            rateLimitKey,
            ...rejRes,
          },
          '[io rate limiter]: Too many requests',
        );
        next(CustomError.tooManyRequests('Too many requests'));
      });
  };

export const SocketRateLimiterMiddleware = {
  use,
};
