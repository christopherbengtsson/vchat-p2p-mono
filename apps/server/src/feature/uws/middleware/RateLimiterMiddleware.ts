import { RateLimiterRedis, type IRateLimiterRes } from 'rate-limiter-flexible';
import { Assert, type Maybe } from '@mono/common-dto';
import { RedisClient } from '../../../common/client/RedisClient.js';
import { HeadersUtil } from '../../../common/util/HeadersUtil.js';
import { log } from '../../../common/util/logger.js';
import { UwsUtil } from '../util/UwsUtil.js';
import type { RequestContext } from '../model/RequestContext.js';
import type { RateLimitOptions } from '../model/RateLimitOptions.js';

const isDevelopment = process.env.NODE_ENV === 'development';

/** Exported for test purposes only */
export const rateLimiterCache = new Map<string, RateLimiterRedis>();

const getRateLimiter = (rateLimiterOptions: Maybe<RateLimitOptions>) => {
  const config = {
    keyPrefix: 'api-rate-limit-middleware',
    points: isDevelopment ? 60 : 30,
    duration: 60, // per minute
    ...rateLimiterOptions,
  };

  const keyPrefix = config.keyPrefix;

  if (!rateLimiterCache.has(keyPrefix)) {
    rateLimiterCache.set(
      keyPrefix,
      new RateLimiterRedis({
        ...config,
        storeClient: RedisClient.get(),
      }),
    );
  }

  const final = rateLimiterCache.get(keyPrefix);
  Assert.isDefined(final, 'RateLimiterRedis instance should be defined');

  return final;
};

const use = async (
  ctx: RequestContext,
  rateLimiterOptions?: RateLimitOptions,
): Promise<boolean> => {
  const rateLimitKey = HeadersUtil.extractIpFromHeaders(ctx.headers);

  if (!rateLimitKey) {
    return false;
  }

  const rateLimiter = getRateLimiter(rateLimiterOptions);

  try {
    await rateLimiter.consume(rateLimitKey);
    return true;
  } catch (rejRes) {
    // Rate limit exceeded
    const rateLimitRes = rejRes as IRateLimiterRes;
    log.warn(
      {
        rateLimitKey,
        ...rateLimitRes,
      },
      '[rate limiter]: Too many requests',
    );

    UwsUtil.sendError(ctx.res, '429 Too Many Requests', 'Rate limited');
    return false;
  }
};

export const RateLimiterMiddleware = {
  use,
};
