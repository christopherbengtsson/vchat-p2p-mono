import type { Response, NextFunction } from 'express';
import { RateLimiterRedis, type IRateLimiterRes } from 'rate-limiter-flexible';
import { Assert, type Maybe } from '@mono/common-dto';
import { RedisClient } from '../client/RedisClient.js';
import type { AuthenticatedRequest } from '../model/AuthenticatedRequest.js';
import { HeadersUtil } from '../util/HeadersUtil.js';
import { log } from '../util/logger.js';
import type { RateLimitOptions } from './model/RateLimitOptions.js';

const isDevelopment = process.env.NODE_ENV === 'development';

const rateLimiterCache = new Map<string, RateLimiterRedis>();

const getRateLimiter = (rateLimiterOptions: Maybe<RateLimitOptions>) => {
  const config = {
    keyPrefix: 'api-rate-limit-middleware',
    points: isDevelopment ? 60 : 30,
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
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.sub;
    const rateLimitKey =
      userId ||
      req.ip ||
      HeadersUtil.extractIpFromHeaders(req.headers) ||
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
          '[rate limiter]: Too many requests',
        );
        res.status(429).send('Too Many Requests');
      });
  };

export const RateLimiterMiddleware = {
  use,
};
