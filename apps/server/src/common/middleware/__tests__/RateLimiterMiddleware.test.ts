import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { RateLimiterMiddleware } from '../RateLimiterMiddleware.js';

vi.mock('rate-limiter-flexible');

vi.mock('../../client/RedisClient.js');

describe('RateLimiterMiddleware', () => {
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

    RateLimiterMiddleware.use(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    // Wait for the promise to resolve
    await vi.waitFor(() => {
      expect(nextFunction).toHaveBeenCalled();
    });

    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.send).not.toHaveBeenCalled();
  });

  it('should block request when rate limit is exceeded', async () => {
    vi.mocked(RateLimiterRedis.prototype.consume).mockRejectedValueOnce(
      new Error('Rate limit exceeded'),
    );

    RateLimiterMiddleware.use(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    // Wait for the promise to reject and the catch block to execute
    await vi.waitFor(() => {
      expect(mockResponse.status).toHaveBeenCalledWith(429);
    });

    expect(mockResponse.send).toHaveBeenCalledWith('Too Many Requests');
    expect(nextFunction).not.toHaveBeenCalled();
  });
});
