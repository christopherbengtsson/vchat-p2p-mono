import { CustomError } from '@mono/common-dto';
import { type z } from 'zod/v4';
import type { EnvironmentConfigSchema } from '../model/EnvironmentConfig.js';
import type { EnvironmentSecretsSchema } from '../model/EnvironmentSecrets.js';
import {
  ServerConfigSchema,
  type ServerConfig,
} from '../model/ServerConfig.js';
import { log } from '../../util/logger.js';

type InputEnvironmentConfig = z.input<typeof EnvironmentConfigSchema>;
type InputEnvironmentSecrets = z.input<typeof EnvironmentSecretsSchema>;

const to = (envConfigInput: {
  config: InputEnvironmentConfig;
  secrets: InputEnvironmentSecrets;
}): ServerConfig => {
  try {
    const parsedServerConfig = ServerConfigSchema.parse({
      config: envConfigInput.config,
      secrets: envConfigInput.secrets,
    });

    return parsedServerConfig;
  } catch (error: unknown) {
    log.fatal(
      {
        error,
      },
      'Server configuration validation failed',
    );

    throw CustomError.badRequest(
      'An unknown error occurred during server configuration validation.',
    );
  }
};

export const ServerConfigMapper = {
  to,
};
