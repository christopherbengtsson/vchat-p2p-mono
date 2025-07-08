import { renderHook, act, waitFor } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import { noop } from '@/common/utils/noop';
import { axiosClient } from '@/common/clients/axios';
import { useCaptcha } from '../hooks/useCaptcha';

// @cap.js/widget is globally mocked in testSetup.ts

// Mock useNoOpCaptcha
vi.mock('../hooks/useNoOpCaptcha', () => ({
  useNoOpCaptcha: () => ({
    captchaLoading: false,
    token: null,
    error: null,
    isReady: false,
    solveAndVerifyCaptcha: vi.fn().mockResolvedValue({ success: true }),
    resetCaptcha: vi.fn(),
  }),
}));

describe('CAPTCHA Error Scenarios', () => {
  let mockAxios: MockAdapter;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
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
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(noop);
    mockCap = (global as any).mockCap;
    mockCapConstructor = (global as any).mockCapConstructor;

    // Mock environment variables
    vi.stubEnv('VITE_CAPTCHA_ENABLED', 'true');
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_SERVER_URL', 'https://api.example.com');
    vi.stubEnv('VITE_CAP_SITE_KEY', 'test-site-key');

    vi.clearAllMocks();
  });

  afterEach(() => {
    mockAxios.restore();
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  describe('Cap.js Widget Failures', () => {
    it('should handle widget initialization failures', async () => {
      const initError = new Error('Widget failed to initialize');
      mockCapConstructor.mockImplementation(() => {
        throw initError;
      });

      const { result } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current?.error).toBe(initError);
      });

      expect(result.current?.isReady).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error initializing captcha instance:',
        initError,
      );
    });

    it('should handle widget solve timeout', async () => {
      const timeoutError = new Error('Solve timeout');
      mockCap.solve.mockRejectedValue(timeoutError);

      const { result } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current?.isReady).toBe(true);
      });

      const solveResult = await act(async () => {
        return result.current.solveAndVerifyCaptcha();
      });

      expect(solveResult).toEqual({
        success: false,
        errorMessage: 'Security verification failed, please try again',
      });
      expect(result.current?.error).toBe(timeoutError);
    });

    it('should handle widget memory allocation failures', async () => {
      const memoryError = new Error('Out of memory');
      mockCap.solve.mockRejectedValue(memoryError);

      const { result } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current?.isReady).toBe(true);
      });

      const solveResult = await act(async () => {
        return result.current.solveAndVerifyCaptcha();
      });

      expect(solveResult.success).toBe(false);
      expect(result.current?.error).toBe(memoryError);
    });

    it('should handle widget crash during solving', async () => {
      const crashError = new Error('Widget crashed');
      mockCap.solve.mockImplementation(() => {
        throw crashError;
      });

      const { result } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current?.isReady).toBe(true);
      });

      await expect(
        act(async () => {
          return result.current.solveAndVerifyCaptcha();
        }),
      ).resolves.toEqual({
        success: false,
        errorMessage: 'Security verification failed, please try again',
      });
    });

    it('should handle widget returning invalid data', async () => {
      // Widget returns null instead of expected object
      mockCap.solve.mockResolvedValue(null);

      const { result } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current?.isReady).toBe(true);
      });

      await expect(
        act(async () => {
          return result.current.solveAndVerifyCaptcha();
        }),
      ).resolves.toEqual({
        success: false,
        errorMessage: 'Security verification failed, please try again',
      });
    });

    it('should handle widget returning malformed token', async () => {
      mockCap.solve.mockResolvedValue({
        token: null, // Invalid token
      });

      const { result } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current?.isReady).toBe(true);
      });

      const solveResult = await act(async () => {
        return result.current.solveAndVerifyCaptcha();
      });

      expect(solveResult.success).toBe(false);
    });

    it('should handle worker thread failures', async () => {
      const workerError = new Error('Worker thread failed');
      mockCap.solve.mockRejectedValue(workerError);

      const { result } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current?.isReady).toBe(true);
      });

      const solveResult = await act(async () => {
        return result.current.solveAndVerifyCaptcha();
      });

      expect(solveResult.success).toBe(false);
      expect(result.current?.error).toBe(workerError);
    });
  });

  describe('Network and Server Failures', () => {
    it('should handle DNS resolution failures', async () => {
      mockCap.solve.mockResolvedValue({ token: 'valid-token' });
      mockAxios.onPost('/captcha/verify').networkError();

      const { result } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current?.isReady).toBe(true);
      });

      const solveResult = await act(async () => {
        return result.current.solveAndVerifyCaptcha();
      });

      expect(solveResult.success).toBe(false);
    });

    it('should handle server unavailable (503)', async () => {
      mockCap.solve.mockResolvedValue({ token: 'valid-token' });
      mockAxios.onPost('/captcha/verify').reply(503, {
        error: 'Service Unavailable',
      });

      const { result } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current?.isReady).toBe(true);
      });

      const solveResult = await act(async () => {
        return result.current.solveAndVerifyCaptcha();
      });

      expect(solveResult.success).toBe(false);
    });

    it('should handle request timeout', async () => {
      mockCap.solve.mockResolvedValue({ token: 'valid-token' });
      mockAxios.onPost('/captcha/verify').timeout();

      const { result } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current?.isReady).toBe(true);
      });

      const solveResult = await act(async () => {
        return result.current.solveAndVerifyCaptcha();
      });

      expect(solveResult.success).toBe(false);
    });

    it('should handle malformed server responses', async () => {
      mockCap.solve.mockResolvedValue({ token: 'valid-token' });
      mockAxios.onPost('/captcha/verify').reply(200, 'not-json');

      const { result } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current?.isReady).toBe(true);
      });

      const solveResult = await act(async () => {
        return result.current.solveAndVerifyCaptcha();
      });

      expect(solveResult.success).toBe(false);
    });

    it('should handle server returning unexpected status codes', async () => {
      mockCap.solve.mockResolvedValue({ token: 'valid-token' });
      mockAxios.onPost('/captcha/verify').reply(418, {
        error: "I'm a teapot",
      });

      const { result } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current?.isReady).toBe(true);
      });

      const solveResult = await act(async () => {
        return result.current.solveAndVerifyCaptcha();
      });

      expect(solveResult.success).toBe(false);
    });

    it('should handle corrupted response data', async () => {
      mockCap.solve.mockResolvedValue({ token: 'valid-token' });
      mockAxios.onPost('/captcha/verify').reply(200, {
        // Missing 'success' field
        data: 'corrupted',
      });

      const { result } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current?.isReady).toBe(true);
      });

      const solveResult = await act(async () => {
        return result.current.solveAndVerifyCaptcha();
      });

      expect(solveResult.success).toBe(false);
    });
  });

  describe('Memory and Resource Failures', () => {
    it('should handle memory leaks during cleanup', async () => {
      const cleanupError = new Error('Cleanup failed');
      mockCap.reset.mockImplementation(() => {
        throw cleanupError;
      });

      const { result, unmount } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current?.isReady).toBe(true);
      });

      expect(() => unmount()).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to reset captcha:',
        cleanupError,
      );
    });

    it('should handle resource exhaustion', async () => {
      const resourceError = new Error('Too many open files');
      mockCapConstructor.mockImplementation(() => {
        throw resourceError;
      });

      const { result } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current?.error).toBe(resourceError);
      });

      expect(result.current?.isReady).toBe(false);
    });

    it('should handle concurrent instance creation', async () => {
      let instanceCount = 0;
      mockCapConstructor.mockImplementation(() => {
        instanceCount++;
        if (instanceCount > 1) {
          throw new Error('Multiple instances not allowed');
        }
        return mockCap;
      });

      const { result, rerender } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current?.isReady).toBe(true);
      });

      // Trigger re-initialization
      rerender();

      // Should not create multiple instances
      expect(instanceCount).toBe(1);
    });
  });

  describe('Configuration and Environment Failures', () => {
    it('should handle missing environment variables', async () => {
      vi.stubEnv('VITE_CAP_SITE_KEY', '');

      const { result } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current?.isReady).toBe(true);
      });

      expect(mockCapConstructor).toHaveBeenCalledWith({
        apiEndpoint: expect.stringContaining('/'),
        workers: 2,
      });
    });

    it('should handle browser compatibility issues', async () => {
      const compatError = new Error('WebAssembly not supported');
      mockCapConstructor.mockImplementation(() => {
        throw compatError;
      });

      const { result } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current?.error).toBe(compatError);
      });
    });
  });

  describe('Race Conditions and Timing Issues', () => {
    it('should handle rapid solve/reset cycles', async () => {
      mockCap.solve.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ token: 'token' }), 100),
          ),
      );
      mockAxios.onPost('/captcha/verify').reply(200, { success: true });

      const { result } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current?.isReady).toBe(true);
      });

      // Start solving
      const solvePromise = act(async () => {
        return result.current.solveAndVerifyCaptcha();
      });

      // Immediately reset
      act(() => {
        result.current.resetCaptcha();
      });

      // Wait for solve to complete
      const solveResult = await solvePromise;

      // Reset clears state but doesn't cancel ongoing operations
      // The solve should still succeed
      expect(solveResult.success).toBe(true);

      // After solve completes, reset has already been called so state should be clean
      // Note: the actual implementation might update token during solve even after reset
      // This tests that the system handles the race condition gracefully without crashing
      expect(result.current?.error).toBe(null);
    });

    it('should handle component unmount during solve', async () => {
      let resolveSolve: (value: any) => void;
      const solvePromise = new Promise((resolve) => {
        resolveSolve = resolve;
      });

      mockCap.solve.mockReturnValue(solvePromise);

      // Make reset throw an error during cleanup
      const cleanupError = new Error('Cleanup error during unmount');
      mockCap.reset.mockImplementation(() => {
        throw cleanupError;
      });

      const { result, unmount } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current?.isReady).toBe(true);
      });

      // Start solving
      act(() => {
        result.current.solveAndVerifyCaptcha();
      });

      // Unmount component - this should trigger cleanup and error
      expect(() => unmount()).not.toThrow();

      // Resolve the promise after unmount
      resolveSolve!({ token: 'token' });

      // Should log the cleanup error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to reset captcha:',
        cleanupError,
      );
    });

    it('should handle multiple simultaneous solve attempts', async () => {
      mockCap.solve.mockResolvedValue({ token: 'token' });
      mockAxios.onPost('/captcha/verify').reply(200, { success: true });

      const { result } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current?.isReady).toBe(true);
      });

      // Start multiple solve attempts simultaneously
      const promise1 = act(async () => {
        return result.current.solveAndVerifyCaptcha();
      });

      const promise2 = act(async () => {
        return result.current.solveAndVerifyCaptcha();
      });

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // Both should complete without errors
      expect(result1.success || result2.success).toBe(true);
    });
  });
});
