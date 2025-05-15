import { RateLimiterRedis } from 'rate-limiter-flexible';
import type { Request, Response, NextFunction } from 'express';
import { redisClient } from '../clients/redis.js';

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'api-rate-limit-middleware', // Prefix for Redis keys to avoid collisions.
  points: 2, // Number of points (requests) allowed...
  duration: 1, // ...per duration in seconds (1 second by default), by IP address.
});

const rateLimiterMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  rateLimiter
    .consume(req.ip as string) // Consume a point for the current IP address.
    .then(() => {
      next(); // Request is within limits, proceed.
    })
    .catch(() => {
      res.status(429).send('Too Many Requests');
    });
};

export default rateLimiterMiddleware;
