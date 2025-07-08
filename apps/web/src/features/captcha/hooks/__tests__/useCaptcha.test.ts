import { renderHook, act, waitFor } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import { CustomError } from '@mono/common-dto';
import { axiosClient } from '@/common/clients/axios';
import { noop } from '@/common/utils/noop';
import { useCaptcha } from '../useCaptcha';
import { useNoOpCaptcha } from '../useNoOpCaptcha';
import { CaptchaResult } from '../../model/CaptchaResult';
import { CaptchaService } from '../../service/CaptchaService';

// @cap.js/widget is globally mocked in testSetup.ts

vi.mock('../../service/CaptchaService');
vi.mock('../useNoOpCaptcha');

describe('useCaptcha', () => {
  let mockAxios: MockAdapter;
  let mockCap: any;

  beforeEach(() => {
    mockAxios = new MockAdapter(axiosClient);
    mockCap = (global as any).mockCap;

    // Mock environment variables using vi.stubEnv
    vi.stubEnv('VITE_CAPTCHA_ENABLED', 'true');
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_SERVER_URL', 'https://example.com');
    vi.stubEnv('VITE_CAP_SITE_KEY', 'test-site-key');

    // Setup CaptchaService mocks
    vi.mocked(CaptchaService.createCaptchaInstance).mockReturnValue(
      mockCap as any,
    );
    vi.mocked(CaptchaService.solveCaptcha).mockResolvedValue({
      token: 'test-token',
      success: true,
    });
    vi.mocked(CaptchaService.verifyCaptchaToken).mockResolvedValue({
      success: true,
    });
    vi.mocked(CaptchaService.resetCaptcha).mockImplementation(() => noop);

    // Mock useNoOpCaptcha
    vi.mocked(useNoOpCaptcha).mockReturnValue({
      captchaLoading: false,
      token: null,
      error: null,
      isReady: false,
      solveAndVerifyCaptcha: vi.fn().mockResolvedValue({ success: true }),
      resetCaptcha: vi.fn(),
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    mockAxios.restore();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('when captcha is disabled', () => {
    it('should return no-op captcha when enabled option is false', () => {
      const mockNoOpResult = {
        captchaLoading: false,
        token: null,
        error: null,
        isReady: false,
        solveAndVerifyCaptcha: vi.fn(),
        resetCaptcha: vi.fn(),
      };
      vi.mocked(useNoOpCaptcha).mockReturnValue(mockNoOpResult);

      const { result } = renderHook(() => useCaptcha({ enabled: false }));

      expect(result.current).toBe(mockNoOpResult);
      expect(useNoOpCaptcha).toHaveBeenCalled();
    });

    it('should return no-op captcha when VITE_CAPTCHA_ENABLED is false', () => {
      vi.stubEnv('VITE_CAPTCHA_ENABLED', 'false');
      const mockNoOpResult = {
        captchaLoading: false,
        token: null,
        error: null,
        isReady: false,
        solveAndVerifyCaptcha: vi.fn(),
        resetCaptcha: vi.fn(),
      };
      vi.mocked(useNoOpCaptcha).mockReturnValue(mockNoOpResult);

      const { result } = renderHook(() => useCaptcha());

      expect(result.current).toBe(mockNoOpResult);
    });
  });

  describe('when captcha is enabled', () => {
    it('should initialize captcha instance on mount', async () => {
      const { result } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(CaptchaService.createCaptchaInstance).toHaveBeenCalledWith(
        'https://example.com/api/v1/captcha/test-site-key/',
      );
    });

    it('should use development endpoint in DEV mode', async () => {
      vi.stubEnv('DEV', true);

      const { result } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(CaptchaService.createCaptchaInstance).toHaveBeenCalledWith(
        'http://localhost:8001/api/v1/captcha/test-site-key/',
      );
    });

    it('should use custom apiEndpoint when provided', async () => {
      const customEndpoint = 'https://custom.example.com/captcha/';

      const { result } = renderHook(() =>
        useCaptcha({ apiEndpoint: customEndpoint }),
      );

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(CaptchaService.createCaptchaInstance).toHaveBeenCalledWith(
        customEndpoint,
      );
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Initialization failed');
      vi.mocked(CaptchaService.createCaptchaInstance).mockImplementation(() => {
        throw error;
      });

      const { result } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current.error).toBe(error);
      });

      expect(result.current.isReady).toBe(false);
    });

    it('should not reinitialize if instance already exists', async () => {
      const { result, rerender } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      const callCount = vi.mocked(CaptchaService.createCaptchaInstance).mock
        .calls.length;

      // Trigger re-render
      rerender();

      expect(
        vi.mocked(CaptchaService.createCaptchaInstance),
      ).toHaveBeenCalledTimes(callCount);
    });
  });

  describe('solveAndVerifyCaptcha', () => {
    it('should return error when not ready', async () => {
      vi.mocked(CaptchaService.createCaptchaInstance).mockImplementation(() => {
        throw new Error('Not ready');
      });

      const { result } = renderHook(() => useCaptcha());

      const solveResult = await result.current.solveAndVerifyCaptcha();

      expect(solveResult).toEqual({
        success: false,
        errorMessage: 'Security verification not ready, please try again',
      });
    });

    it('should solve and verify captcha successfully', async () => {
      vi.mocked(CaptchaService.solveCaptcha).mockResolvedValue({
        token: 'solved-token',
        success: true,
      });
      vi.mocked(CaptchaService.verifyCaptchaToken).mockResolvedValue({
        success: true,
      });

      const { result } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      const solveResult = await act(async () => {
        return result.current.solveAndVerifyCaptcha();
      });

      expect(solveResult).toEqual({ success: true });
      expect(result.current.captchaLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should handle captcha solving failure', async () => {
      const solveError = new Error('Solve failed');
      vi.mocked(CaptchaService.solveCaptcha).mockResolvedValue({
        token: '',
        success: false,
        error: solveError,
      });

      const { result } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      const solveResult = await act(async () => {
        return result.current.solveAndVerifyCaptcha();
      });

      expect(solveResult).toEqual({
        success: false,
        errorMessage: 'Security verification failed, please try again',
      });
      expect(result.current.error).toBe(solveError);
    });

    it('should handle verification failure', async () => {
      const verifyError = CustomError.badState('Verification failed');
      vi.mocked(CaptchaService.solveCaptcha).mockResolvedValue({
        token: 'solved-token',
        success: true,
      });
      vi.mocked(CaptchaService.verifyCaptchaToken).mockResolvedValue({
        success: false,
        error: verifyError,
      });

      const { result } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      const solveResult = await act(async () => {
        return result.current.solveAndVerifyCaptcha();
      });

      expect(solveResult).toEqual({
        success: false,
        errorMessage: 'Security verification failed, please try again',
      });
      expect(result.current.error).toBe(verifyError);
    });

    it('should handle unexpected errors', async () => {
      const unexpectedError = new Error('Unexpected error');
      vi.mocked(CaptchaService.solveCaptcha).mockRejectedValue(unexpectedError);

      const { result } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      const solveResult = await act(async () => {
        return result.current.solveAndVerifyCaptcha();
      });

      expect(solveResult).toEqual({
        success: false,
        errorMessage: 'Security verification failed, please try again',
      });
      expect(result.current.error).toBe(unexpectedError);
    });

    it('should set loading state during solving', async () => {
      let resolvePromise: (value: any) => void;
      const solvePromise = new Promise((resolve) => {
        resolvePromise = resolve;
      }) as Promise<CaptchaResult>;

      vi.mocked(CaptchaService.solveCaptcha).mockReturnValue(solvePromise);
      vi.mocked(CaptchaService.verifyCaptchaToken).mockResolvedValue({
        success: true,
      });

      const { result } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      // Start solving (without await to check loading state)
      const solveAndVerifyPromise = result.current.solveAndVerifyCaptcha();

      await waitFor(() => {
        expect(result.current.captchaLoading).toBe(true);
      });

      // Resolve the promise
      resolvePromise!({
        token: 'token',
        success: true,
      });

      // Wait for completion
      await act(async () => {
        await solveAndVerifyPromise;
      });

      expect(result.current.captchaLoading).toBe(false);
    });
  });

  describe('resetCaptcha', () => {
    it('should reset captcha instance and state', async () => {
      const { result } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current?.isReady).toBe(true);
      });

      act(() => {
        result.current?.resetCaptcha();
      });

      expect(CaptchaService.resetCaptcha).toHaveBeenCalledWith(mockCap);
      expect(result.current?.token).toBe(null);
      expect(result.current?.error).toBe(null);
    });

    it('should handle reset when instance is null', async () => {
      vi.mocked(CaptchaService.createCaptchaInstance).mockImplementation(() => {
        throw new Error('No instance');
      });

      const { result } = renderHook(() => useCaptcha());

      // Wait for the error state
      await waitFor(
        () => {
          expect(result.current?.error).toBeTruthy();
        },
        { timeout: 2000 },
      );

      expect(() => {
        act(() => {
          result.current?.resetCaptcha();
        });
      }).not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should cleanup captcha instance on unmount', async () => {
      const { result, unmount } = renderHook(() => useCaptcha());

      await waitFor(
        () => {
          expect(result.current?.isReady).toBe(true);
        },
        { timeout: 2000 },
      );

      unmount();

      expect(CaptchaService.resetCaptcha).toHaveBeenCalledWith(mockCap);
    });

    it('should handle cleanup errors gracefully', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {
          // Mock implementation
        });
      vi.mocked(CaptchaService.resetCaptcha).mockImplementation(() => {
        throw new Error('Cleanup failed');
      });

      const { result, unmount } = renderHook(() => useCaptcha());

      await waitFor(
        () => {
          expect(result.current?.isReady).toBe(true);
        },
        { timeout: 2000 },
      );

      expect(() => unmount()).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('memoization', () => {
    it('should memoize initialization callback', async () => {
      const { result, rerender } = renderHook(
        ({ apiEndpoint }) => useCaptcha({ apiEndpoint }),
        { initialProps: { apiEndpoint: 'https://example.com' } },
      );

      await waitFor(
        () => {
          expect(result.current?.isReady).toBe(true);
        },
        { timeout: 2000 },
      );

      const initialCallback = result.current?.solveAndVerifyCaptcha;

      rerender({ apiEndpoint: 'https://example.com' });

      expect(result.current?.solveAndVerifyCaptcha).toBe(initialCallback);
    });
  });
});
