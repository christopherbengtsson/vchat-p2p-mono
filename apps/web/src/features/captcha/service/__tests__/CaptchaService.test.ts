import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { CustomError } from '@mono/common-dto';
import { axiosClient } from '@/common/clients/axios';
import { CaptchaService } from '../CaptchaService';

// @cap.js/widget is globally mocked in testSetup.ts

describe('CaptchaService', () => {
  let mockAxios: MockAdapter;
  let mockCap: any;
  let mockCapConstructor: any;

  beforeAll(() => {
    vi.stubGlobal('navigator', {
      ...navigator,
      hardwareConcurrency: 2, // Mocking hardwareConcurrency for Cap.js testing
    });
  });

  beforeEach(() => {
    mockAxios = new MockAdapter(axiosClient);
    mockCap = (global as any).mockCap;
    mockCapConstructor = (global as any).mockCapConstructor;
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockAxios.restore();
    vi.restoreAllMocks();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  describe('createCaptchaInstance', () => {
    it('should create a new Cap instance with correct configuration', () => {
      const apiEndpoint = 'https://example.com/captcha';

      const instance = CaptchaService.createCaptchaInstance(apiEndpoint);

      expect(mockCapConstructor).toHaveBeenCalledWith({
        apiEndpoint,
        workers: 2,
      });
      expect(instance).toBe(mockCap);
    });

    it('should create instances with different endpoints', () => {
      const endpoint1 = 'https://dev.example.com/captcha';
      const endpoint2 = 'https://prod.example.com/captcha';

      CaptchaService.createCaptchaInstance(endpoint1);
      CaptchaService.createCaptchaInstance(endpoint2);

      expect(mockCapConstructor).toHaveBeenCalledTimes(2);
      expect(mockCapConstructor).toHaveBeenNthCalledWith(1, {
        apiEndpoint: endpoint1,
        workers: 2,
      });
      expect(mockCapConstructor).toHaveBeenNthCalledWith(2, {
        apiEndpoint: endpoint2,
        workers: 2,
      });
    });
  });

  describe('solveCaptcha', () => {
    it('should return success result when captcha is solved', async () => {
      const expectedToken = 'solved-token-123';
      mockCap.solve.mockResolvedValue({ token: expectedToken });

      const result = await CaptchaService.solveCaptcha(mockCap as any);

      expect(mockCap.solve).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        token: expectedToken,
        success: true,
      });
    });

    it('should return error result when captcha solving fails', async () => {
      const error = new Error('Captcha solving failed');
      mockCap.solve.mockRejectedValue(error);

      const result = await CaptchaService.solveCaptcha(mockCap as any);

      expect(mockCap.solve).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        token: '',
        success: false,
        error,
      });
    });

    it('should handle non-Error exceptions', async () => {
      const stringError = 'String error';
      mockCap.solve.mockRejectedValue(stringError);

      const result = await CaptchaService.solveCaptcha(mockCap as any);

      expect(result).toEqual({
        token: '',
        success: false,
        error: stringError,
      });
    });

    it('should handle null/undefined solutions', async () => {
      mockCap.solve.mockResolvedValue(null);

      const result = await CaptchaService.solveCaptcha(mockCap as any);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
    });

    it('should handle solutions without token', async () => {
      mockCap.solve.mockResolvedValue({});

      const result = await CaptchaService.solveCaptcha(mockCap as any);

      expect(result).toEqual({
        token: undefined,
        success: true,
      });
    });
  });

  describe('resetCaptcha', () => {
    it('should call reset on the captcha instance', () => {
      CaptchaService.resetCaptcha(mockCap as any);

      expect(mockCap.reset).toHaveBeenCalledTimes(1);
    });

    it('should handle reset errors gracefully', () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      const resetError = new Error('Reset failed');
      mockCap.reset.mockImplementation(() => {
        throw resetError;
      });

      expect(() => CaptchaService.resetCaptcha(mockCap as any)).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to reset captcha:',
        resetError,
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('verifyCaptchaToken', () => {
    const validToken = 'valid-token-123';

    it('should return success when verification succeeds', async () => {
      mockAxios.onPost('/captcha/verify').reply(200, { success: true });

      const result = await CaptchaService.verifyCaptchaToken(validToken);

      expect(result).toEqual({
        success: true,
        error: undefined,
      });
    });

    it('should return error when verification fails on server', async () => {
      mockAxios.onPost('/captcha/verify').reply(200, { success: false });

      const result = await CaptchaService.verifyCaptchaToken(validToken);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(CustomError);
      expect(result.error?.message).toBe('Captcha verification failed');
    });

    it('should handle HTTP error status codes', async () => {
      mockAxios.onPost('/captcha/verify').reply(500);

      const result = await CaptchaService.verifyCaptchaToken(validToken);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
    });

    it('should handle HTTP 400 status codes', async () => {
      mockAxios.onPost('/captcha/verify').reply(400);

      const result = await CaptchaService.verifyCaptchaToken(validToken);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
    });

    it('should send correct request payload', async () => {
      mockAxios.onPost('/captcha/verify').reply(200, { success: true });

      await CaptchaService.verifyCaptchaToken(validToken);

      expect(mockAxios.history.post).toHaveLength(1);
      expect(mockAxios.history.post[0].data).toBe(
        JSON.stringify({ token: validToken }),
      );
    });

    it('should handle network errors', async () => {
      mockAxios.onPost('/captcha/verify').networkError();

      const result = await CaptchaService.verifyCaptchaToken(validToken);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
    });

    it('should handle timeout errors', async () => {
      mockAxios.onPost('/captcha/verify').timeout();

      const result = await CaptchaService.verifyCaptchaToken(validToken);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
    });

    it('should handle malformed JSON responses', async () => {
      mockAxios.onPost('/captcha/verify').reply(200, 'invalid-json');

      const result = await CaptchaService.verifyCaptchaToken(validToken);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
    });

    it('should handle missing response data', async () => {
      mockAxios.onPost('/captcha/verify').reply(200);

      const result = await CaptchaService.verifyCaptchaToken(validToken);

      expect(result.success).toBe(false);
    });

    it('should handle null response data', async () => {
      mockAxios.onPost('/captcha/verify').reply(200, null);

      const result = await CaptchaService.verifyCaptchaToken(validToken);

      expect(result.success).toBe(false);
    });
  });
});
