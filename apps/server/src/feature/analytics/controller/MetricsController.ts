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

const register = (app: Express) => {
  app.get(HttpRoutePaths[HttpRoute.METRICS], async (_req, res) => {
    try {
      // Get standard Prometheus metrics from the global registry
      // This includes Node.js default metrics and BullMQ prom-client metrics

      const standardMetrics = await promRegister.metrics();

      // Get BullMQ native Prometheus metrics with global labels
      const globalVariables = {
        env: ServerConfigService.getConfig().config.env,
      };

      let bullmqNativeMetrics: Maybe<string> = '';

      try {
        bullmqNativeMetrics =
          await MetricsService.getBullMQPrometheusMetrics(globalVariables);
      } catch (error) {
        // Log the error but continue with just standard metrics
        log.error({ error }, 'Failed to get BullMQ native metrics');
      }

      // Combine metrics using string concatenation
      // Registry.merge() only works with Registry instances, not string outputs
      const metricsToInclude = [standardMetrics, bullmqNativeMetrics].filter(
        (metrics) => metrics && metrics.trim().length > 0,
      );

      const combinedMetrics = metricsToInclude.join('\n');

      res.set('Content-Type', promRegister.contentType);
      res.end(combinedMetrics);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      log.error({ error: err }, 'Failed to generate metrics');
      res.status(500).end(errorMessage);
    }
  });
};

export const MetricsController = {
  register,
};
