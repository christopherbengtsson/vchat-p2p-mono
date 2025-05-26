import { z } from 'zod/v4';

export const EnvironmentSecretsSchema = z.object({
  server: z.object({
    apiKey: z.string(),
  }),
  redis: z.object({
    url: z.string(),
    port: z.coerce.number(),
    username: z.string(),
    password: z.string(),
  }),
  supabase: z.object({
    url: z.string(),
    serviceRoleKey: z.string(),
    jwtSecret: z.string(),
  }),
  socketIo: z.object({
    allowedOrigins: z.string(),
    adminUiUsername: z.string(),
    adminUiPassword: z.string(),
  }),
});

export type EnvironmentSecrets = z.infer<typeof EnvironmentSecretsSchema>;
