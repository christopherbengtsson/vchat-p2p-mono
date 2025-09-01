import type { IRateLimiterOptions } from 'rate-limiter-flexible';

export type RateLimitOptions = Omit<IRateLimiterOptions, 'storeClient'>;
