import type { Socket } from 'socket.io';
import { RateLimiterRedis, type IRateLimiterRes } from 'rate-limiter-flexible';
import { Assert, CustomError, type Maybe } from '@mono/common-dto';
import type { JwtPayload } from 'jsonwebtoken';
import { RedisClient } from '../../../common/client/RedisClient.js';
import { log } from '../../../common/util/logger.js';
import { HeadersUtil } from '../../../common/util/HeadersUtil.js';
import type { RateLimitOptions } from '../model/RateLimitOptions.js';
import type { IncomingMessage } from '../../socket-io/model/IncomingMessage.js';

const isDevelopment = process.env.NODE_ENV === 'development';

const rateLimiterCache = new Map<string, RateLimiterRedis>();

const getRateLimiter = (rateLimiterOptions: Maybe<RateLimitOptions>) => {
  const config = {
    keyPrefix: 'socket-rate-limit-middleware',
    points: isDevelopment ? 100 : 50,
    duration: 60, // per minute
    ...rateLimiterOptions,
  };

  const keyPrefix = config.keyPrefix;

  if (!rateLimiterCache.has(keyPrefix)) {
    rateLimiterCache.set(
      keyPrefix,
      new RateLimiterRedis({
        ...config,
        storeClient: RedisClient.get(),
      }),
    );
  }

  const final = rateLimiterCache.get(keyPrefix);
  Assert.isDefined(final, 'RateLimiterRedis instance should be defined');

  return final;
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
