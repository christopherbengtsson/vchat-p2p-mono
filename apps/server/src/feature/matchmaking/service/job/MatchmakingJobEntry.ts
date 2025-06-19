import type { Job } from 'bullmq';
import { log } from '../../../../common/util/logger.js';
import { SocketServer } from '../../../socket-io/server/SocketServer.js';
import { matchmakingProcessConfig } from '../../config/MatchmakingProcessConfig.js';
import { MatchmakingOrchestrator } from '../orchestrator/MatchmakingOrchestrator.js';
import { MatchmakingMetricsService } from '../metrics/MatchmakingMetricsService.js';

const create = async (job: Job) => {
  try {
    const result = await MatchmakingOrchestrator.processQueue(
      SocketServer.io,
      matchmakingProcessConfig,
      job,
    );

    MatchmakingMetricsService.recordJobMetrics(job.queueName, result);
  } catch (error) {
    log.error(
      {
        error,
        jobId: job.id,
        workerId: job.data.workerId,
        queueName: job.queueName,
      },
      `Worker failed matchmaking job processing`,
    );

    MatchmakingMetricsService.recordJobFailure(job.queueName);

    throw error; // Let BullMQ handle retry
  }
};

export const MatchmakingJobEntry = {
  /** Main job */
  create,
};
