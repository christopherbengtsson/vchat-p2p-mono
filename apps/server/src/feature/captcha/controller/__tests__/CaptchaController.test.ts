import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Express, Request, Response } from 'express';
import { CustomError, CustomErrorType } from '@mono/common-dto';
import { CaptchaController } from '../CaptchaController.js';
import { CaptchaService } from '../../service/CaptchaService.js';

// Mock dependencies
vi.mock('../../service/CaptchaService.js');
vi.mock('../../../../common/util/logger.js', () => ({
  log: {
    error: vi.fn(),
  },
}));
vi.mock('../../../../common/middleware/RateLimiterMiddleware.js', () => ({
  RateLimiterMiddleware: {
    use: vi.fn((_req, _res, next) => next()),
  },
}));
vi.mock('../../../../common/middleware/ApiKeyMiddleware.js', () => ({
  ApiKeyMiddleware: {
    use: vi.fn((_req, _res, next) => next()),
  },
}));

describe('CaptchaController', () => {
  let mockApp: Partial<Express>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let routeHandler: (req: Request, res: Response) => Promise<void>;

  beforeEach(() => {
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockApp = {
      post: vi.fn((_path, ...handlers) => {
        // Extract the actual route handler (last function in the array)
        routeHandler = handlers[handlers.length - 1];
      }) as any,
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('register', () => {
    it('should register the captcha verification route', () => {
      CaptchaController.register(mockApp as Express);

      expect(mockApp.post).toHaveBeenCalledWith(
        '/api/v1/captcha/verify',
        expect.any(Function), // RateLimiterMiddleware.use
        expect.any(Function), // ApiKeyMiddleware.use
        expect.any(Function), // route handler
      );
    });
  });

  describe('captcha verification endpoint', () => {
    beforeEach(() => {
      CaptchaController.register(mockApp as Express);
    });

    it('should return 400 when token is missing', async () => {
      mockReq = {
        body: {},
      };

      await routeHandler(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Missing captcha token',
      });
    });

    it('should return 400 when token is empty string', async () => {
      mockReq = {
        body: { token: '' },
      };

      await routeHandler(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Missing captcha token',
      });
    });

    it('should return 200 with success true when captcha is verified', async () => {
      const mockToken = 'valid-captcha-token';
      mockReq = {
        body: { token: mockToken },
      };

      vi.mocked(CaptchaService.verifyCaptchaToken).mockResolvedValue(true);

      await routeHandler(mockReq as Request, mockRes as Response);

      expect(CaptchaService.verifyCaptchaToken).toHaveBeenCalledWith(mockToken);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
      });
    });

    it('should return 200 with success false when captcha verification fails', async () => {
      const mockToken = 'invalid-captcha-token';
      mockReq = {
        body: { token: mockToken },
      };

      vi.mocked(CaptchaService.verifyCaptchaToken).mockResolvedValue(false);

      await routeHandler(mockReq as Request, mockRes as Response);

      expect(CaptchaService.verifyCaptchaToken).toHaveBeenCalledWith(mockToken);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
      });
    });

    it('should return 500 when CaptchaService throws a CustomError', async () => {
      const mockToken = 'error-token';
      const customError = new CustomError(
        CustomErrorType.SERVER_ERROR,
        'Service unavailable',
      );

      mockReq = {
        body: { token: mockToken },
      };

      vi.mocked(CaptchaService.verifyCaptchaToken).mockRejectedValue(
        customError,
      );

      await routeHandler(mockReq as Request, mockRes as Response);

      expect(CaptchaService.verifyCaptchaToken).toHaveBeenCalledWith(mockToken);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
      });
    });

    it('should return 500 when CaptchaService throws a generic Error', async () => {
      const mockToken = 'error-token';
      const genericError = new Error('Network failure');

      mockReq = {
        body: { token: mockToken },
      };

      vi.mocked(CaptchaService.verifyCaptchaToken).mockRejectedValue(
        genericError,
      );

      await routeHandler(mockReq as Request, mockRes as Response);

      expect(CaptchaService.verifyCaptchaToken).toHaveBeenCalledWith(mockToken);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
      });
    });

    it('should handle non-Error exceptions', async () => {
      const mockToken = 'error-token';
      const stringError = 'Something went wrong';

      mockReq = {
        body: { token: mockToken },
      };

      vi.mocked(CaptchaService.verifyCaptchaToken).mockRejectedValue(
        stringError,
      );

      await routeHandler(mockReq as Request, mockRes as Response);

      expect(CaptchaService.verifyCaptchaToken).toHaveBeenCalledWith(mockToken);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
      });
    });
  });
});
