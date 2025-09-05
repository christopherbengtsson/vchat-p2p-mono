import { CustomError, CustomErrorType } from '@mono/common-dto';
import { CaptchaService } from '../CaptchaService.js';
import { ServerConfigService } from '../../../../common/config/service/ServerConfigService.js';

// Mock dependencies
vi.mock('../../../../common/config/service/ServerConfigService.js');
vi.mock('../../../../common/util/logger.js', () => ({
  log: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const mockIp = '123';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('CaptchaService', () => {
  const mockConfig = {
    config: {
      port: 8000,
      serverRegion: 'us-east-1',
      logLevel: 'info' as const,
      env: 'test' as const,
      allowedOrigins: 'http://localhost:3000',
      jobConfig: {
        defaultJobOptions: {
          removeOnComplete: 5,
          removeOnFail: 5,
        },
      },
    },
    secrets: {
      capServer: {
        baseUrl: 'https://captcha-server.example.com',
        siteKey: 'test-site-key',
        secretKey: 'test-secret-key',
      },
    },
  } as any;

  beforeEach(() => {
    vi.mocked(ServerConfigService.getConfig).mockReturnValue(mockConfig);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('verifyCaptchaToken', () => {
    const validToken = 'valid-captcha-token';

    it('should return true when captcha verification succeeds', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await CaptchaService.verifyCaptchaToken(
        mockIp,
        validToken,
      );

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://captcha-server.example.com/test-site-key/siteverify',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-forwarded-for': mockIp,
          },
          body: JSON.stringify({
            secret: 'test-secret-key',
            response: validToken,
          }),
        },
      );
    });

    it('should return false when captcha verification fails', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ success: false }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await CaptchaService.verifyCaptchaToken(
        mockIp,
        validToken,
      );

      expect(result).toBe(false);
    });

    it('should throw CustomError when fetch response is not ok', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(
        CaptchaService.verifyCaptchaToken(mockIp, validToken),
      ).rejects.toThrow(CustomError);

      await expect(
        CaptchaService.verifyCaptchaToken(mockIp, validToken),
      ).rejects.toThrow('Captcha verification request failed: 500');
    });

    it('should handle invalid configuration gracefully', async () => {
      const invalidConfig = {
        ...mockConfig,
        secrets: {
          capServer: {
            baseUrl: 'invalid-url',
            siteKey: '',
            secretKey: 'test-secret-key',
          },
        },
      };
      vi.mocked(ServerConfigService.getConfig).mockReturnValue(invalidConfig);

      // Should still attempt the request but likely fail due to invalid URL
      await expect(
        CaptchaService.verifyCaptchaToken(mockIp, validToken),
      ).rejects.toThrow(CustomError);
    });

    it('should throw CustomError when fetch throws a network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(
        CaptchaService.verifyCaptchaToken(mockIp, validToken),
      ).rejects.toThrow(CustomError);

      await expect(
        CaptchaService.verifyCaptchaToken(mockIp, validToken),
      ).rejects.toThrow('Failed to verify captcha token');
    });

    it('should re-throw CustomError when service throws CustomError', async () => {
      const customError = new CustomError(
        CustomErrorType.BAD_REQUEST,
        'Custom service error',
      );
      mockFetch.mockRejectedValue(customError);

      await expect(
        CaptchaService.verifyCaptchaToken(mockIp, validToken),
      ).rejects.toThrow(customError);
    });

    it('should handle JSON parsing errors', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(
        CaptchaService.verifyCaptchaToken(mockIp, validToken),
      ).rejects.toThrow(CustomError);

      await expect(
        CaptchaService.verifyCaptchaToken(mockIp, validToken),
      ).rejects.toThrow('Failed to verify captcha token');
    });

    it('should handle missing success field in response', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await CaptchaService.verifyCaptchaToken(
        mockIp,
        validToken,
      );

      expect(result).toBe(undefined);
    });

    it('should handle null response from JSON parsing', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(null),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(
        CaptchaService.verifyCaptchaToken(mockIp, validToken),
      ).rejects.toThrow();
    });
  });
});
