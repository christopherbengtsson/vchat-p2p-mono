import { z } from 'zod/v4';

export const EnvironmentConfigSchema = z.object({
  port: z.coerce.number().default(8000),
  serverRegion: z.string(),
  logLevel: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  env: z.enum(['development', 'test', 'production']),
  cache: z.object({
    redis: z.object({
      ignoredUsersTTL: z.coerce.number().positive().default(120), // 2 minutes
    }),
  }),
  allowedOrigins: z.string(),
  jobConfig: z.object({
    periodicCleanupInterval: z.coerce.number().default(300000), // 5 minutes
  }),
});

export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;
