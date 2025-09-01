import type { RequestContext } from '../../model/RequestContext.js';
import { UwsUtil } from '../../util/UwsUtil.js';
import type { RateLimitOptions } from '../../model/RateLimitOptions.js';
import {
  rateLimiterCache,
  RateLimiterMiddleware,
} from '../RateLimiterMiddleware.js';

const mockIp = '127.0.0.1';
const mockHeaders = { 'x-forwarded-for': mockIp };

const ctxMock = {
  headers: { ...mockHeaders },
  res: { cork: vi.fn() },
} as unknown as RequestContext;

const rateLimitOptionsMock: RateLimitOptions = {
  points: 2,
  duration: 1,
  blockDuration: 30,
  keyPrefix: 'rate-limiter-test',
};

vi.mock('../../util/logger.js', () => ({
  log: {
    warn: vi.fn(),
  },
}));

describe('RateLimiterMiddleware', () => {
  afterEach(() => {
    vi.clearAllMocks();
    rateLimiterCache.clear();
  });

  it('should not throw when rate limit is not exceeded', async () => {
    expect(await RateLimiterMiddleware.use(ctxMock, rateLimitOptionsMock)).toBe(
      true,
    );
  });

  it('should return false when rate limit is exceeded', async () => {
    const options = { ...rateLimitOptionsMock, points: 1, duration: 60 };

    await RateLimiterMiddleware.use(ctxMock, options);
    const result = await RateLimiterMiddleware.use(ctxMock, options);

    expect(result).toBe(false);
  });

  it('should return false if no IP is present in headers', async () => {
    const ctx = {
      headers: {},
      res: { cork: vi.fn() },
    } as unknown as RequestContext;
    const result = await RateLimiterMiddleware.use(ctx, rateLimitOptionsMock);
    expect(result).toBe(false);
  });

  it('should track limits per IP separately', async () => {
    const ctx1 = {
      headers: { 'x-forwarded-for': '127.0.0.1' },
      res: { cork: vi.fn() },
    } as unknown as RequestContext;
    const ctx2 = {
      headers: { 'x-forwarded-for': '192.168.0.1' },
      res: { cork: vi.fn() },
    } as unknown as RequestContext;
    const options = { ...rateLimitOptionsMock, points: 1, duration: 60 };

    await RateLimiterMiddleware.use(ctx1, options);
    const result2 = await RateLimiterMiddleware.use(ctx2, options);

    expect(result2).toBe(true); // second IP unaffected
  });

  it('should block repeated requests during blockDuration', async () => {
    const options = {
      ...rateLimitOptionsMock,
      points: 1,
      duration: 60,
      blockDuration: 2,
    };

    await RateLimiterMiddleware.use(ctxMock, options); // consume
    const blocked1 = await RateLimiterMiddleware.use(ctxMock, options);
    const blocked2 = await RateLimiterMiddleware.use(ctxMock, options);

    expect(blocked1).toBe(false);
    expect(blocked2).toBe(false);
  });

  it('should reset after duration expires', async () => {
    const options = {
      ...rateLimitOptionsMock,
      points: 1,
      duration: 1,
      blockDuration: 0,
    };

    await RateLimiterMiddleware.use(ctxMock, options); // consume
    const blocked = await RateLimiterMiddleware.use(ctxMock, options);
    expect(blocked).toBe(false);

    await new Promise((r) => setTimeout(r, 1100)); // wait > duration
    const allowedAgain = await RateLimiterMiddleware.use(ctxMock, options);
    expect(allowedAgain).toBe(true);
  });

  it('should send error response when limit exceeded', async () => {
    const spy = vi.spyOn(UwsUtil, 'sendError');
    const options = { ...rateLimitOptionsMock, points: 1, duration: 60 };

    await RateLimiterMiddleware.use(ctxMock, options);
    await RateLimiterMiddleware.use(ctxMock, options);

    expect(spy).toHaveBeenCalledWith(
      ctxMock.res,
      '429 Too Many Requests',
      'Rate limited',
    );
  });
});
