import type { Maybe } from '@mono/common-dto';
import { BullMQBootstrapService } from '../bootstrap/BullMQBootstrapService.js';
import { log } from '../../../../common/util/logger.js';

const getBullMQPrometheusMetrics = async (
  globalVariables?: Record<string, string>,
): Promise<Maybe<string>> => {
  try {
    const allMetrics: string[] = [];

    for (const { queues } of BullMQBootstrapService.bullMQInstances) {
      for (const [queueName, queue] of queues) {
        try {
          const queueMetrics =
            await queue.exportPrometheusMetrics(globalVariables);

          if (queueMetrics && queueMetrics.trim().length > 0) {
            allMetrics.push(queueMetrics);
          }
        } catch (error) {
          log.error(
            { error, queueName },
            `Failed to export metrics for queue: ${queueName}`,
          );
        }
      }
    }

    return allMetrics.join('\n');
  } catch (error) {
    log.error({ error }, 'Failed to get BullMQ instances for metrics export');
  }
};

export const MetricsService = {
  getBullMQPrometheusMetrics,
};
