import { CustomError } from '@mono/common-dto';
import { type JobConfig, jobConfigSchema } from '../model/JobConfig.js';

const jobConfigs = new Map<string, JobConfig>();

const loadDefaultConfig = (): JobConfig => {
  // TODO
  // Fetch parts of the default config from ServerConfigService (or job specific configs? if needed
  // For example, if 'interval' should come from a global app setting:
  // const serverConfig = ServerConfigService.getConfig();
  // const defaultInterval = serverConfig.config.matchmaking?.interval || 5000;

  // For now, we use the defaults defined in the Zod schema directly
  return jobConfigSchema.parse({}); // Parses an empty object to get defaults
};

const _set = (jobId: string, config: JobConfig): void => {
  jobConfigs.set(jobId, config);
};

const mergeWithOverridesAndStore = (
  jobId: string,
  baseConfig: JobConfig,
  overrides?: Partial<JobConfig>,
): JobConfig => {
  let finalConfig = baseConfig;
  if (overrides) {
    // Merge and validate. Zod will throw an error if overrides are invalid.
    finalConfig = jobConfigSchema.parse({
      ...baseConfig,
      ...overrides,
    });
  }
  jobConfigs.set(jobId, finalConfig);
  return finalConfig;
};

const get = (jobId: string): JobConfig => {
  const config = jobConfigs.get(jobId);
  if (!config) {
    throw CustomError.badState(
      `[JobConfigService] Queue job config for job ID '${jobId}' not initialized.`,
    );
  }
  return config;
};

const remove = (jobId: string): void => {
  jobConfigs.delete(jobId);
};

export const JobConfigService = {
  loadDefaultConfig,
  mergeWithOverridesAndStore,
  get,
  remove,

  // For testing purposes
  _set,
};
