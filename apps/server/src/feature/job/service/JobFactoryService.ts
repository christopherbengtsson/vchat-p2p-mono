import { v4 as uuid } from 'uuid';
import { ServerConfigService } from '../../../common/config/service/ServerConfigService.js';
import { log } from '../../../common/util/logger.js';
import type { JobEntryPoint } from '../model/JobEntryPoint.js';
import type { JobConfig } from '../model/JobConfig.js';
import type { JobType } from '../model/JobType.js';
import { JobConfigService } from './JobConfigService.js';
import { JobStateService } from './JobStateService.js';
import { JobRunnerService } from './JobRunnerService.js';

const init = (
  baseJobType: JobType,
  jobEntryPoint: JobEntryPoint,
  overrides?: Partial<JobConfig>,
) => {
  const defaultConfig = JobConfigService.loadDefaultConfig();
  const serverConfig = ServerConfigService.getConfig();
  const serverRegion = serverConfig.config.serverRegion;

  const effectiveJobType = `${baseJobType}-${serverRegion}`;
  const jobId = `${effectiveJobType}-${uuid()}`;

  const finalConfig = JobConfigService.mergeWithOverridesAndStore(
    jobId,
    defaultConfig,
    overrides,
  );
  log.debug(
    { instanceJobId: jobId, finalConfig },
    '[JobFactoryService] Job config stored.',
  );

  const initialState = JobStateService.init(jobId);

  log.info(
    {
      effectiveJobType,
      baseJobType,
      serverRegion,
      instanceJobId: jobId,
      finalConfig,
    },
    '[JobFactoryService] Queue Job Instance initialized',
  );

  const start = async () => {
    try {
      log.info(
        { jobId: initialState.jobId, effectiveJobType },
        '[JobFactoryService] Starting job via instance facade.',
      );
      await JobRunnerService.start(
        initialState.jobId,
        effectiveJobType,
        jobEntryPoint,
        finalConfig,
      );
    } catch (error) {
      log.error(
        { error, jobId: initialState.jobId, effectiveJobType },
        '[JobFactoryService] Error starting job via instance facade.',
      );
      throw error;
    }
  };

  const stop = async () => {
    try {
      log.info(
        { jobId: initialState.jobId, effectiveJobType },
        '[JobFactoryService] Stopping job via instance facade.',
      );
      await JobRunnerService.stop(initialState.jobId, effectiveJobType);
    } catch (error) {
      log.error(
        { error, jobId: initialState.jobId, effectiveJobType },
        '[JobFactoryService] Error stopping job via instance facade.',
      );
      throw error;
    }
  };

  return {
    jobId: jobId,
    baseJobType,
    effectiveJobType,
    serverRegion,
    config: finalConfig,

    start,
    stop,

    getState: () => JobStateService.get(initialState.jobId),

    destroy: async () => {
      log.info(
        { effectiveJobType, instanceJobId: jobId },
        '[JobFactoryService] Destroying job instance via facade',
      );
      await JobRunnerService.stop(jobId, effectiveJobType);
      JobStateService.remove(jobId);
      JobConfigService.remove(jobId);
      log.debug(
        { effectiveJobType, instanceJobId: jobId },
        '[JobFactoryService] Job instance data cleaned up after destroy.',
      );
    },
  };
};

export const JobFactoryService = {
  init,
};
