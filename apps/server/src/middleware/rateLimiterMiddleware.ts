import { RateLimiterRedis } from 'rate-limiter-flexible';
import type { Request, Response, NextFunction } from 'express';
import redisClient from '../redis/client.js';

const rateLimiter = new RateLimiterRedis({
  keyPrefix: 'api-rate-limit-middleware',
  storeClient: redisClient,
  points: 2, // 2 requests
  duration: 1, // per 1 second by IP
});

const rateLimiterMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  rateLimiter
    .consume(req.ip as string)
    .then(() => {
      next();
    })
    .catch(() => {
      res.status(429).send('Too Many Requests');
    });
};

export default rateLimiterMiddleware;
