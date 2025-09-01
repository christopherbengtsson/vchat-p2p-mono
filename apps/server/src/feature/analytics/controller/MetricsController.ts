import type { TemplatedApp } from 'uWebSockets.js';
import { register as promRegister } from 'prom-client';
import {
  HttpRoute,
  HttpRoutePaths,
} from '../../../common/config/model/HttpRoute.js';
import { MetricsService } from '../../job/bullmq/service/MetricsService.js';
import { UwsUtil } from '../../uws/util/UwsUtil.js';
import { ServerConfigService } from '../../../common/config/service/ServerConfigService.js';

const handleMetrics = UwsUtil.createHandler(
  (ctx) => {
    UwsUtil.runAsync(ctx, {
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
