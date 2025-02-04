import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import rateLimiterMiddleware from '../rateLimiterMiddleware.js';

vi.mock('rate-limiter-flexible');
vi.mock('../../redis/client', () => ({
  default: {
    connect: vi.fn(),
  },
}));

describe('rateLimiterMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      ip: '127.0.0.1',
    };
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    };
    nextFunction = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should allow request when rate limit is not exceeded', async () => {
    vi.mocked(RateLimiterRedis.prototype.consume).mockResolvedValueOnce(
      {} as any,
    );

    await rateLimiterMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.send).not.toHaveBeenCalled();
  });

  it('should block request when rate limit is exceeded', async () => {
    vi.mocked(RateLimiterRedis.prototype.consume).mockRejectedValueOnce(
      new Error('Rate limit exceeded'),
    );

    await rateLimiterMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    await expect.poll(() => mockResponse.status).toHaveBeenCalledWith(429);
    expect(mockResponse.send).toHaveBeenCalledWith('Too Many Requests');

    expect(nextFunction).not.toHaveBeenCalled();
  });
});
