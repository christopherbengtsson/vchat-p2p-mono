import { z } from 'zod/v4';

export const jobConfigSchema = z.object({
  interval: z.number().positive().default(1000), // Default interval: 1 second
  // batchSize: z.number().positive().default(100),
  // maxRetries: z.number().int().min(0).default(3),
});

export type JobConfig = z.infer<typeof jobConfigSchema>;
