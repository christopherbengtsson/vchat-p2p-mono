import type { z } from 'zod/v4';
import type { EnvironmentConfigSchema } from '../model/EnvironmentConfig.js';
import type { EnvironmentSecretsSchema } from '../model/EnvironmentSecrets.js';

type InputEnvironmentConfig = z.input<typeof EnvironmentConfigSchema>;
type InputEnvironmentSecrets = z.input<typeof EnvironmentSecretsSchema>;

const loadServerConfig = (
  processEnv: NodeJS.ProcessEnv,
): InputEnvironmentConfig => ({
  port: processEnv.PORT,
  env: processEnv.NODE_ENV as InputEnvironmentConfig['env'],
  logLevel: processEnv.PINO_LOG_LEVEL as InputEnvironmentConfig['logLevel'],
  serverRegion: processEnv.SERVER_REGION || '',
  cache: {
    redis: {
      ignoredUsersTTL: processEnv.IGNORED_USERS_REDIS_CACHE_TTL,
    },
  },
  allowedOrigins: processEnv.CORS_ORIGINS || '',
  jobConfig: {
    periodicCleanupInterval: processEnv.PERIODIC_CLEANUP_INTERVAL as string,
  },
});

const loadSecrets = (
  processEnv: NodeJS.ProcessEnv,
): InputEnvironmentSecrets => {
  const server: InputEnvironmentSecrets['server'] = {
    apiKey: processEnv.API_KEY || '',
  };

  const redis: InputEnvironmentSecrets['redis'] = {
    url: processEnv.REDIS_URL || '',
    port: processEnv.REDIS_PORT,
    username: processEnv.REDIS_USERNAME || '',
    password: processEnv.REDIS_PASSWORD || '',
  };

  const supabase: InputEnvironmentSecrets['supabase'] = {
    url: processEnv.SUPABASE_URL || '',
    serviceRoleKey: processEnv.SUPABASE_SERVICE_ROLE_KEY || '',
    jwtSecret: processEnv.SUPABASE_JWT_SECRET || '',
  };

  const socketIo: InputEnvironmentSecrets['socketIo'] = {
    allowedOrigins: processEnv.CORS_ORIGINS || '',
    adminUiUsername: processEnv.ADMIN_UI_USERNAME || '',
    adminUiPassword: processEnv.ADMIN_UI_PASSWORD || '',
  };

  return {
    server,
    redis,
    supabase,
    socketIo,
  };
};

const load = (
  processEnv: NodeJS.ProcessEnv,
): {
  config: InputEnvironmentConfig;
  secrets: InputEnvironmentSecrets;
} => {
  const config = loadServerConfig(processEnv);
  const secrets = loadSecrets(processEnv);

  return {
    config,
    secrets,
  };
};

export const EnvironmentService = {
  load,
};
