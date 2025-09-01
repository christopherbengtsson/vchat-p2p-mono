import type { TemplatedApp } from 'uWebSockets.js';
import {
  HttpRoute,
  HttpRoutePaths,
} from '../../../common/config/model/HttpRoute.js';
import type { RateLimitOptions } from '../../uws/model/RateLimitOptions.js';
import { UwsUtil } from '../../uws/util/UwsUtil.js';

// Health Check Rate Limits
// Dev: 60/min | Prod: 30/min (Deployment script friendly)
const rateLimitOptions: RateLimitOptions = {
  points: process.env.NODE_ENV === 'development' ? 60 : 30,
  duration: 60,
  blockDuration: 30,
  keyPrefix: 'health-check',
  execEvenly: process.env.NODE_ENV === 'production',
};

const handleHealth = UwsUtil.createHandler(
  (ctx) => {
    UwsUtil.runAsync(ctx, {
      rateLimitOptions,
      work: async () => {
        UwsUtil.sendResponse(ctx.res, '200 OK', 'Ok');
      },
    });
  },
  { validateApiKey: false },
);

const register = (app: TemplatedApp) => {
  app.get(HttpRoutePaths[HttpRoute.HEALTH], handleHealth);
};

export const HealthController = {
  register,
};
