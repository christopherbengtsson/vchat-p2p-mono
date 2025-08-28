import type { Express } from 'express';
import { register as promRegister } from 'prom-client';
import type { Maybe } from '@mono/common-dto';
import {
  HttpRoute,
  HttpRoutePaths,
} from '../../../common/config/model/HttpRoute.js';
import { MetricsService } from '../../job/bullmq/service/MetricsService.js';
import { log } from '../../../common/util/logger.js';
import { ServerConfigService } from '../../../common/config/service/ServerConfigService.js';
import { RateLimiterMiddleware } from '../../../common/middleware/RateLimiterMiddleware.js';
import type { RateLimitOptions } from '../../../common/middleware/model/RateLimitOptions.js';

// Metrics Scraping Rate Limits
// Dev: 60/min | Prod: 30/min (Grafana scraping friendly)
const rateLimitOptions: RateLimitOptions = {
  points: process.env.NODE_ENV === 'development' ? 60 : 30,
  duration: 60,
  blockDuration: 300,
  keyPrefix: 'metrics',
  execEvenly: false,
};

const register = (app: Express) => {
  app.get(
    HttpRoutePaths[HttpRoute.METRICS],
    RateLimiterMiddleware.use(rateLimitOptions),
    async (_req, res) => {
      try {
        const standardMetrics = await promRegister.metrics();

        const globalVariables = {
          env: ServerConfigService.getConfig().config.env,
        };

        let bullmqNativeMetrics: Maybe<string> = '';

        try {
          bullmqNativeMetrics =
            await MetricsService.getBullMQPrometheusMetrics(globalVariables);
        } catch (error) {
          log.error({ error }, 'Failed to get BullMQ native metrics');
        }

        // Registry.merge() only works with Registry instances, not string outputs
        const metricsToInclude = [standardMetrics, bullmqNativeMetrics].filter(
          (metrics) => metrics && metrics.trim().length > 0,
        );

        const combinedMetrics = metricsToInclude.join('\n');

        res.set('Content-Type', promRegister.contentType);
        res.end(combinedMetrics);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        log.error({ error: err }, 'Failed to generate metrics');
        res.status(500).end(errorMessage);
      }
    },
  );
};

export const MetricsController = {
  register,
};
