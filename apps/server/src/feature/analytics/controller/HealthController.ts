import type { Express } from 'express';
import {
  HttpRoute,
  HttpRoutePaths,
} from '../../../common/config/model/HttpRoute.js';
import { RateLimiterMiddleware } from '../../../common/middleware/RateLimiterMiddleware.js';
import type { RateLimitOptions } from '../../../common/middleware/model/RateLimitOptions.js';

const rateLimitOptions: RateLimitOptions = {
  points: process.env.NODE_ENV === 'development' ? 300 : 180,
  duration: 60,
  blockDuration: 30,
  keyPrefix: 'health-check',
  execEvenly: true,
};

const register = (app: Express) => {
  app.get(
    HttpRoutePaths[HttpRoute.HEALTH],
    RateLimiterMiddleware.use(rateLimitOptions),
    (_req, res) => {
      res.status(200).send('Ok');
    },
  );
};

export const HealthController = {
  register,
};
