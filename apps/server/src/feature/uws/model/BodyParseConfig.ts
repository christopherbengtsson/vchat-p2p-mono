import type { RateLimitOptions } from './RateLimitOptions.js';

export interface BodyParseConfig {
  maxSize?: number;
  timeoutMs?: number;
  rateLimitOptions?: RateLimitOptions;
}
