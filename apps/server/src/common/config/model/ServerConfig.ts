import { z } from 'zod/v4';
import { EnvironmentConfigSchema } from './EnvironmentConfig.js';
import { EnvironmentSecretsSchema } from './EnvironmentSecrets.js';

export const ServerConfigSchema = z.object({
  config: EnvironmentConfigSchema,
  secrets: EnvironmentSecretsSchema,
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;
