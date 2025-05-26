import { z } from 'zod/v4';
import { HttpRoute } from './HttpRoute.js';
import { EnvironmentConfigSchema } from './EnvironmentConfig.js';
import { EnvironmentSecretsSchema } from './EnvironmentSecrets.js';

export const ServerConfigSchema = z.object({
  config: EnvironmentConfigSchema,
  secrets: EnvironmentSecretsSchema,
  httpRoutePaths: z.record(z.enum(HttpRoute), z.string()), // TODO: Nest into constants object maybe
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;
