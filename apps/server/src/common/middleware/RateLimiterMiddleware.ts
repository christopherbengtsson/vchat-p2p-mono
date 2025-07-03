import type { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import type { Maybe } from '@mono/common-dto';
import { RedisClient } from '../client/RedisClient.js';

let rateLimiter: Maybe<RateLimiterRedis>;

const getRateLimiter = () => {
  if (!rateLimiter) {
    rateLimiter = new RateLimiterRedis({
      storeClient: RedisClient.get(),
      keyPrefix: 'api-rate-limit-middleware', // Prefix for Redis keys to avoid collisions.
      points: 10, // Number of points (requests) allowed...
      duration: 3, // ...per duration in seconds (1 second by default)
    });
  }
  return rateLimiter;
};

const use = (req: Request, res: Response, next: NextFunction) => {
  getRateLimiter()
    .consume(req.ip as string)
    .then(() => {
      next();
    })
    .catch(() => {
      res.status(429).send('Too Many Requests');
    });
};

export const RateLimiterMiddleware = {
  use,
};
