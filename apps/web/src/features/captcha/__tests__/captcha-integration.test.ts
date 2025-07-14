import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
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

describe('CAPTCHA Integration Tests', () => {
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

    // Mock environment variables
    vi.stubEnv('VITE_CAPTCHA_ENABLED', 'true');
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_SERVER_URL', 'https://api.example.com');
    vi.stubEnv('VITE_CAP_SITE_KEY', 'test-site-key');

    vi.clearAllMocks();
  });

  afterEach(() => {
    mockAxios.restore();
    vi.restoreAllMocks();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  describe('Full CAPTCHA Flow', () => {
    it('should complete full captcha solving and verification flow', async () => {
      const captchaToken = 'solved-captcha-token-123';

      // Mock Cap.js solving
      mockCap.solve.mockResolvedValue({ token: captchaToken });

      // Mock backend verification
      mockAxios.onPost('/captcha/verify').reply(200, { success: true });

      const { result } = renderHook(() => useCaptcha());

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      // Execute full flow
      const flowResult = await act(async () => {
        return result.current.solveAndVerifyCaptcha();
      });

      // Verify results
      expect(flowResult).toEqual({ success: true });
      expect(mockCap.solve).toHaveBeenCalledTimes(1);
      expect(mockAxios.history.post).toHaveLength(1);
      expect(JSON.parse(mockAxios.history.post[0].data)).toEqual({
        token: captchaToken,
      });
    });

    it('should handle captcha solving failure in full flow', async () => {
      const solveError = new Error('Widget failed to solve');
      mockCap.solve.mockRejectedValue(solveError);

      const { result } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      const flowResult = await act(async () => {
        return result.current.solveAndVerifyCaptcha();
      });

      expect(flowResult).toEqual({
        success: false,
        errorMessage: 'Security verification failed, please try again',
      });
      expect(result.current.error).toBe(solveError);
      expect(mockAxios.history.post).toHaveLength(0); // Should not reach verification
    });

    it('should handle backend verification failure in full flow', async () => {
      const captchaToken = 'invalid-token';
      mockCap.solve.mockResolvedValue({ token: captchaToken });
      mockAxios.onPost('/captcha/verify').reply(200, { success: false });

      const { result } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      const flowResult = await act(async () => {
        return result.current.solveAndVerifyCaptcha();
      });

      expect(flowResult).toEqual({
        success: false,
        errorMessage: 'Security verification failed, please try again',
      });
      expect(mockAxios.history.post).toHaveLength(1);
    });

    it('should handle backend server errors in full flow', async () => {
      const captchaToken = 'server-error-token';
      mockCap.solve.mockResolvedValue({ token: captchaToken });
      mockAxios.onPost('/captcha/verify').reply(500, { error: 'Server error' });

      const { result } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      const flowResult = await act(async () => {
        return result.current.solveAndVerifyCaptcha();
      });

      expect(flowResult).toEqual({
        success: false,
        errorMessage: 'Security verification failed, please try again',
      });
    });

    it('should handle network failures during verification', async () => {
      const captchaToken = 'network-error-token';
      mockCap.solve.mockResolvedValue({ token: captchaToken });
      mockAxios.onPost('/captcha/verify').networkError();

      const { result } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      const flowResult = await act(async () => {
        return result.current.solveAndVerifyCaptcha();
      });

      expect(flowResult).toEqual({
        success: false,
        errorMessage: 'Security verification failed, please try again',
      });
    });
  });

  describe('State Management Integration', () => {
    it('should maintain correct state throughout the flow', async () => {
      const captchaToken = 'state-test-token';
      let resolveCapSolve: (value: any) => void;
      const capSolvePromise = new Promise((resolve) => {
        resolveCapSolve = resolve;
      });

      mockCap.solve.mockReturnValue(capSolvePromise);
      mockAxios.onPost('/captcha/verify').reply(200, { success: true });

      const { result } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current?.isReady).toBe(true);
      });

      // Initial state
      expect(result.current?.captchaLoading).toBe(false);
      expect(result.current?.token).toBe(null);
      expect(result.current?.error).toBe(null);

      // Start solving
      let solvePromise: Promise<any>;
      act(() => {
        solvePromise = result.current.solveAndVerifyCaptcha();
      });

      // Loading state - wait a bit for async state updates
      await waitFor(() => {
        expect(result.current?.captchaLoading).toBe(true);
      });
      expect(result.current?.error).toBe(null);

      // Resolve solving
      act(() => {
        resolveCapSolve!({ token: captchaToken });
      });

      await act(async () => {
        await solvePromise!;
      });

      // Final state
      expect(result.current?.captchaLoading).toBe(false);
      expect(result.current?.error).toBe(null);
    });

    it('should update state correctly on reset', async () => {
      const { result } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current?.isReady).toBe(true);
      });

      // Set some state by solving a captcha that fails verification
      mockCap.solve.mockResolvedValue({ token: 'test-token' });
      mockAxios.onPost('/captcha/verify').reply(200, { success: false });

      await act(async () => {
        await result.current.solveAndVerifyCaptcha();
      });

      // Verify we have some error state
      expect(result.current?.error).not.toBe(null);

      // Reset
      act(() => {
        result.current.resetCaptcha();
      });

      // Verify reset state
      expect(result.current?.token).toBe(null);
      expect(result.current?.error).toBe(null);
      expect(mockCap.reset).toHaveBeenCalled();
    });
  });

  describe('Configuration Integration', () => {
    it('should use correct endpoints in development vs production', async () => {
      // Test development configuration
      vi.stubEnv('DEV', true);

      const { result: devResult } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(devResult.current?.isReady).toBe(true);
      });

      expect(mockCapConstructor).toHaveBeenCalledWith({
        apiEndpoint: expect.any(String),
        workers: expect.any(Number),
      });

      // Reset for production test
      vi.clearAllMocks();
      vi.stubEnv('DEV', false);

      const { result: prodResult } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(prodResult.current?.isReady).toBe(true);
      });

      expect(mockCapConstructor).toHaveBeenCalledWith({
        apiEndpoint: expect.any(String),
        workers: expect.any(Number),
      });
    });

    it('should respect custom configuration options', async () => {
      const customOptions = {
        enabled: true,
      };

      const { result } = renderHook(() => useCaptcha(customOptions));

      await waitFor(() => {
        expect(result.current?.isReady).toBe(true);
      });

      expect(mockCapConstructor).toHaveBeenCalledWith({
        apiEndpoint: expect.any(String),
        workers: expect.any(Number),
      });
    });
  });

  describe('Error Recovery Integration', () => {
    it('should allow retry after solving failure', async () => {
      const firstError = new Error('First attempt failed');
      const secondToken = 'retry-success-token';

      // First attempt fails
      mockCap.solve
        .mockRejectedValueOnce(firstError)
        .mockResolvedValueOnce({ token: secondToken });

      mockAxios.onPost('/captcha/verify').reply(200, { success: true });

      const { result } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current?.isReady).toBe(true);
      });

      // First attempt
      const firstResult = await act(async () => {
        return result.current.solveAndVerifyCaptcha();
      });

      expect(firstResult.success).toBe(false);
      expect(result.current?.error).toBe(firstError);

      // Reset before retry
      act(() => {
        result.current.resetCaptcha();
      });

      // Second attempt
      const secondResult = await act(async () => {
        return result.current.solveAndVerifyCaptcha();
      });

      expect(secondResult.success).toBe(true);
      expect(result.current?.error).toBe(null);
    });

    it('should handle intermittent network issues', async () => {
      const captchaToken = 'network-retry-token';
      mockCap.solve.mockResolvedValue({ token: captchaToken });

      // First request fails, second succeeds
      mockAxios
        .onPost('/captcha/verify')
        .replyOnce(() => Promise.reject(new Error('Network error')))
        .onPost('/captcha/verify')
        .reply(200, { success: true });

      const { result } = renderHook(() => useCaptcha());

      await waitFor(() => {
        expect(result.current?.isReady).toBe(true);
      });

      // First attempt (network failure)
      const firstResult = await act(async () => {
        return result.current.solveAndVerifyCaptcha();
      });

      expect(firstResult.success).toBe(false);

      // Reset and retry
      act(() => {
        result.current.resetCaptcha();
      });

      // Second attempt (success)
      const secondResult = await act(async () => {
        return result.current.solveAndVerifyCaptcha();
      });

      expect(secondResult.success).toBe(true);
    });
  });
});
