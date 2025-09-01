import type { TemplatedApp } from 'uWebSockets.js';
import { register as promRegister } from 'prom-client';
import {
  HttpRoute,
  HttpRoutePaths,
} from '../../../common/config/model/HttpRoute.js';
import { MetricsService } from '../../job/bullmq/service/MetricsService.js';
import { UwsUtil } from '../../uws/util/UwsUtil.js';
import { ServerConfigService } from '../../../common/config/service/ServerConfigService.js';
import type { RateLimitOptions } from '../../uws/model/RateLimitOptions.js';

// Metrics Scraping Rate Limits
// Dev: 60/min | Prod: 30/min (Grafana scraping friendly)
const rateLimitOptions: RateLimitOptions = {
  points: process.env.NODE_ENV === 'development' ? 60 : 30,
  duration: 60,
  blockDuration: 300,
  keyPrefix: 'metrics',
  execEvenly: false,
};

const handleMetrics = UwsUtil.createHandler(
  (ctx) => {
    UwsUtil.runAsync(ctx, {
      rateLimitOptions,
      work: async () => {
        const standardMetrics = await promRegister.metrics();
        const bullmqMetrics = await MetricsService.getBullMQPrometheusMetrics({
          env: ServerConfigService.getConfig().config.env,
        });

        const combinedMetrics = [standardMetrics, bullmqMetrics]
          .filter((m) => m?.trim())
          .join('\n');

        UwsUtil.sendResponse(ctx.res, '200 OK', combinedMetrics, {
          'Content-Type': promRegister.contentType,
        });
      },
    });
  },
  { validateApiKey: false },
);

const register = (app: TemplatedApp) => {
  app.get(HttpRoutePaths[HttpRoute.METRICS], handleMetrics);
};

export const MetricsController = {
  register,
};
