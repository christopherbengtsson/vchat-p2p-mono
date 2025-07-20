import { renderHook, act, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { CustomError } from '@mono/common-dto';
import { CaptchaService } from '../../service/CaptchaService';
import { useSolveCaptcha } from '../useSolveCaptcha';

// @cap.js/widget is globally mocked in testSetup.ts
vi.mock('../../service/CaptchaService');
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe('useSolveCaptcha', () => {
  let mockCap: any;

  beforeEach(() => {
    vi.stubEnv('VITE_CAPTCHA_ENABLED', 'true');
    mockCap = (global as any).mockCap;

    // Setup CaptchaService mocks with default success responses
    vi.mocked(CaptchaService.solve).mockResolvedValue({
      token: 'test-token',
      success: true,
    });
    vi.mocked(CaptchaService.verify).mockResolvedValue({
      success: true,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useSolveCaptcha());

      expect(result.current.isSolving).toBe(false);
      expect(typeof result.current.solve).toBe('function');
    });

    it('should provide stable function references', () => {
      const { result, rerender } = renderHook(() => useSolveCaptcha());

      const firstSolve = result.current.solve;

      rerender();

      const secondSolve = result.current.solve;

      expect(firstSolve).toBe(secondSolve);
    });
  });

  describe('solve function', () => {
    it('should handle null cap parameter', async () => {
      const { result } = renderHook(() => useSolveCaptcha());

      const solveResult = await act(async () => {
        return result.current.solve(null);
      });

      expect(solveResult).toEqual({ success: false });
      expect(result.current.isSolving).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Captcha not initialized');
    });

    it('should handle undefined cap parameter', async () => {
      const { result } = renderHook(() => useSolveCaptcha());

      const solveResult = await act(async () => {
        return result.current.solve(undefined);
      });

      expect(solveResult).toEqual({ success: false });
      expect(result.current.isSolving).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Captcha not initialized');
    });

    it('should successfully solve and verify captcha', async () => {
      const { result } = renderHook(() => useSolveCaptcha());

      const solveResult = await act(async () => {
        return result.current.solve(mockCap);
      });

      expect(solveResult).toEqual({ success: true });
      expect(result.current.isSolving).toBe(false);
      expect(CaptchaService.solve).toHaveBeenCalledWith(mockCap);
      expect(CaptchaService.verify).toHaveBeenCalledWith('test-token');
      expect(toast.error).not.toHaveBeenCalled();
    });
  });

  describe('loading states', () => {
    it('should set isSolving to true during solving process', async () => {
      let resolvePromise: (value: any) => void;
      const solvePromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(CaptchaService.solve).mockReturnValue(solvePromise as any);

      const { result } = renderHook(() => useSolveCaptcha());

      // Start solving (without await to check loading state)
      const solveAndVerifyPromise = result.current.solve(mockCap);

      await waitFor(() => {
        expect(result.current.isSolving).toBe(true);
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

      expect(result.current.isSolving).toBe(false);
    });

    it('should reset isSolving on captcha solve failure', async () => {
      vi.mocked(CaptchaService.solve).mockResolvedValue({
        token: '',
        success: false,
        error: new Error('Solve failed'),
      });

      const { result } = renderHook(() => useSolveCaptcha());

      const solveResult = await act(async () => {
        return result.current.solve(mockCap);
      });

      expect(result.current.isSolving).toBe(false);
      expect(solveResult).toEqual({ success: false });
    });

    it('should reset isSolving on verification failure', async () => {
      vi.mocked(CaptchaService.verify).mockResolvedValue({
        success: false,
        error: CustomError.badState('Verification failed'),
      });

      const { result } = renderHook(() => useSolveCaptcha());

      const solveResult = await act(async () => {
        return result.current.solve(mockCap);
      });

      expect(result.current.isSolving).toBe(false);
      expect(solveResult).toEqual({ success: false });
    });
  });

  describe('error handling', () => {
    it('should handle captcha solve failure with error', async () => {
      const solveError = new Error('Solve failed');
      vi.mocked(CaptchaService.solve).mockResolvedValue({
        token: '',
        success: false,
        error: solveError,
      });

      const { result } = renderHook(() => useSolveCaptcha());

      const solveResult = await act(async () => {
        return result.current.solve(mockCap);
      });

      expect(solveResult).toEqual({ success: false });
      expect(toast.error).toHaveBeenCalledWith('Captcha solving failed');
      expect(CaptchaService.verify).not.toHaveBeenCalled();
    });

    it('should handle captcha solve failure without error', async () => {
      vi.mocked(CaptchaService.solve).mockResolvedValue({
        token: '',
        success: false,
      });

      const { result } = renderHook(() => useSolveCaptcha());

      const solveResult = await act(async () => {
        return result.current.solve(mockCap);
      });

      expect(solveResult).toEqual({ success: false });
      expect(toast.error).toHaveBeenCalledWith('Captcha solving failed');
    });

    it('should handle verification failure with error', async () => {
      const verifyError = CustomError.badState('Verification failed');
      vi.mocked(CaptchaService.verify).mockResolvedValue({
        success: false,
        error: verifyError,
      });

      const { result } = renderHook(() => useSolveCaptcha());

      const solveResult = await act(async () => {
        return result.current.solve(mockCap);
      });

      expect(solveResult).toEqual({ success: false });
      expect(toast.error).toHaveBeenCalledWith('Captcha verification failed');
      expect(CaptchaService.solve).toHaveBeenCalledWith(mockCap);
      expect(CaptchaService.verify).toHaveBeenCalledWith('test-token');
    });

    it('should handle verification failure without error', async () => {
      vi.mocked(CaptchaService.verify).mockResolvedValue({
        success: false,
      });

      const { result } = renderHook(() => useSolveCaptcha());

      const solveResult = await act(async () => {
        return result.current.solve(mockCap);
      });

      expect(solveResult).toEqual({ success: false });
      expect(toast.error).toHaveBeenCalledWith('Captcha verification failed');
    });

    it('should propagate unexpected errors during solving', async () => {
      const unexpectedError = new Error('Network error');
      vi.mocked(CaptchaService.solve).mockRejectedValue(unexpectedError);

      const { result } = renderHook(() => useSolveCaptcha());

      await expect(async () => {
        await act(async () => {
          await result.current.solve(mockCap);
        });
      }).rejects.toThrow('Network error');
    });

    it('should propagate unexpected errors during verification', async () => {
      const unexpectedError = new Error('Network error');
      vi.mocked(CaptchaService.verify).mockRejectedValue(unexpectedError);

      const { result } = renderHook(() => useSolveCaptcha());

      await expect(async () => {
        await act(async () => {
          await result.current.solve(mockCap);
        });
      }).rejects.toThrow('Network error');

      expect(CaptchaService.solve).toHaveBeenCalledWith(mockCap);
    });
  });

  describe('service integration', () => {
    it('should call CaptchaService methods with correct parameters', async () => {
      const { result } = renderHook(() => useSolveCaptcha());

      await act(async () => {
        await result.current.solve(mockCap);
      });

      expect(CaptchaService.solve).toHaveBeenCalledWith(mockCap);
      expect(CaptchaService.solve).toHaveBeenCalledTimes(1);
      expect(CaptchaService.verify).toHaveBeenCalledWith('test-token');
      expect(CaptchaService.verify).toHaveBeenCalledTimes(1);
    });

    it('should handle different tokens from solve results', async () => {
      const customToken = 'custom-solved-token-123';
      vi.mocked(CaptchaService.solve).mockResolvedValue({
        token: customToken,
        success: true,
      });

      const { result } = renderHook(() => useSolveCaptcha());

      await act(async () => {
        await result.current.solve(mockCap);
      });

      expect(CaptchaService.verify).toHaveBeenCalledWith(customToken);
    });

    it('should not call verification if solving fails', async () => {
      vi.mocked(CaptchaService.solve).mockResolvedValue({
        token: '',
        success: false,
        error: new Error('Solve failed'),
      });

      const { result } = renderHook(() => useSolveCaptcha());

      await act(async () => {
        await result.current.solve(mockCap);
      });

      expect(CaptchaService.solve).toHaveBeenCalledWith(mockCap);
      expect(CaptchaService.verify).not.toHaveBeenCalled();
    });
  });

  describe('toast notifications', () => {
    it('should show appropriate error messages for different failure types', async () => {
      vi.stubEnv('VITE_CAPTCHA_ENABLED', 'true');

      const { result } = renderHook(() => useSolveCaptcha());

      // Test null cap
      await act(async () => {
        await result.current.solve(null);
      });

      expect(toast.error).toHaveBeenLastCalledWith('Captcha not initialized');

      // Test solve failure
      vi.mocked(CaptchaService.solve).mockResolvedValue({
        token: '',
        success: false,
      });
      await act(async () => {
        await result.current.solve(mockCap);
      });
      expect(toast.error).toHaveBeenLastCalledWith('Captcha solving failed');

      // Test verification failure
      vi.mocked(CaptchaService.solve).mockResolvedValue({
        token: 'token',
        success: true,
      });
      vi.mocked(CaptchaService.verify).mockResolvedValue({
        success: false,
      });
      await act(async () => {
        await result.current.solve(mockCap);
      });
      expect(toast.error).toHaveBeenLastCalledWith(
        'Captcha verification failed',
      );
    });

    it('should not show toast on successful solve and verify', async () => {
      const { result } = renderHook(() => useSolveCaptcha());

      await act(async () => {
        await result.current.solve(mockCap);
      });

      expect(toast.error).not.toHaveBeenCalled();
    });
  });
});
