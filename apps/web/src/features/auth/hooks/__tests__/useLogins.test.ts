import { renderHook, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import AxiosMockAdapter from 'axios-mock-adapter';
import type { AuthError } from '@supabase/supabase-js';
import { ClientAuthService } from '@mono/fe-supabase';
import { DatabaseService } from '@mono/common-supabase';
import { CustomError, CustomErrorType } from '@mono/common-dto';
import { axiosClient } from '@/common/clients/axios';
import { TestWithQueryContext } from '@/testUtils';
import { useLogins } from '../useLogins';

// Mock CAPTCHA service for authentication flow tests
vi.mock('../../../captcha/service/CaptchaService', () => ({
  CaptchaService: {
    verifyCaptchaToken: vi.fn(),
  },
}));

// Mock useCaptcha hook
vi.mock('../../../captcha/hooks/useCaptcha', () => ({
  useCaptcha: () => ({
    captchaLoading: false,
    token: null,
    error: null,
    isReady: true,
    solveAndVerifyCaptcha: vi.fn().mockResolvedValue({ success: true }),
    resetCaptcha: vi.fn(),
  }),
}));

const axiosMock = new AxiosMockAdapter(axiosClient, {
  onNoMatch: 'throwException',
});

describe('useLogins', () => {
  beforeAll(() => {
    axiosMock.reset();
  });

  beforeEach(() => {
    vi.spyOn(ClientAuthService, 'loginAnonymously').mockResolvedValue();
    vi.spyOn(ClientAuthService, 'loginWithEmail').mockResolvedValue();
    vi.spyOn(DatabaseService, 'isBlacklisted').mockResolvedValue({
      data: null,
    } as any);
    axiosMock.onPost('/signature').reply(200, {
      fingerprint: 'fingerprint',
    });
  });

  describe('loginAnonymously', () => {
    it('works', async () => {
      const { result } = renderHook(() => useLogins(), {
        wrapper: TestWithQueryContext,
      });

      result.current.loginAnonymouslyMutation.mutate();

      await waitFor(() => {
        expect(result.current.loginAnonymouslyMutation.isSuccess).toBe(true);
      });
    });

    it('throws if user fingerprint is blacklisted', async () => {
      const mockToast = vi.spyOn(toast, 'error');
      vi.spyOn(DatabaseService, 'isBlacklisted').mockResolvedValue({
        data: {
          created_at: 'timestamp',
          fingerprint: 'fingerprint',
          id: '1',
        },
      } as any);

      const { result } = renderHook(() => useLogins(), {
        wrapper: TestWithQueryContext,
      });

      result.current.loginAnonymouslyMutation.mutate();

      await waitFor(() => {
        expect(result.current.loginAnonymouslyMutation.isError).toBe(true);
      });

      expect(result.current.loginAnonymouslyMutation.error).toEqual(
        new CustomError(CustomErrorType.UNAUTHORIZED, 'User is banned'),
      );

      expect(mockToast).toHaveBeenCalledWith('User is banned');
    });
  });

  describe('loginWithEmail', () => {
    it('works', async () => {
      const { result } = renderHook(() => useLogins(), {
        wrapper: TestWithQueryContext,
      });

      result.current.loginWithEmailMutation.mutate({
        email: 'email',
        password: 'password',
      });

      await waitFor(() => {
        expect(result.current.loginWithEmailMutation.isSuccess).toBe(true);
      });
    });

    it('throws if user is banned', async () => {
      const mockToast = vi.spyOn(toast, 'error');
      vi.spyOn(ClientAuthService, 'loginWithEmail').mockRejectedValue({
        code: 'user_banned',
      } as AuthError);

      const { result } = renderHook(() => useLogins(), {
        wrapper: TestWithQueryContext,
      });

      result.current.loginWithEmailMutation.mutate({
        email: 'email',
        password: 'password',
      });

      await waitFor(() => {
        expect(result.current.loginWithEmailMutation.isError).toBe(true);
      });
      expect(mockToast).toHaveBeenCalledWith('User is banned, try again later');
    });
  });

  describe('CAPTCHA Integration', () => {
    it('should handle CAPTCHA verification during anonymous login', async () => {
      // Mock CAPTCHA being required
      vi.stubEnv('VITE_CAPTCHA_ENABLED', 'true');

      const { result } = renderHook(() => useLogins(), {
        wrapper: TestWithQueryContext,
      });

      result.current.loginAnonymouslyMutation.mutate();

      await waitFor(() => {
        expect(result.current.loginAnonymouslyMutation.isSuccess).toBe(true);
      });

      // CAPTCHA should be transparent to the authentication flow
      expect(ClientAuthService.loginAnonymously).toHaveBeenCalled();
    });

    it('should handle CAPTCHA verification during email login', async () => {
      // Mock CAPTCHA being required
      vi.stubEnv('VITE_CAPTCHA_ENABLED', 'true');

      const { result } = renderHook(() => useLogins(), {
        wrapper: TestWithQueryContext,
      });

      result.current.loginWithEmailMutation.mutate({
        email: 'test@example.com',
        password: 'password123',
      });

      await waitFor(() => {
        expect(result.current.loginWithEmailMutation.isSuccess).toBe(true);
      });

      // CAPTCHA should be transparent to the authentication flow
      expect(ClientAuthService.loginWithEmail).toHaveBeenCalled();
    });

    it('should gracefully handle CAPTCHA disabled state', async () => {
      // Mock CAPTCHA being disabled
      vi.stubEnv('VITE_CAPTCHA_ENABLED', 'false');

      const { result } = renderHook(() => useLogins(), {
        wrapper: TestWithQueryContext,
      });

      result.current.loginAnonymouslyMutation.mutate();

      await waitFor(() => {
        expect(result.current.loginAnonymouslyMutation.isSuccess).toBe(true);
      });

      // Authentication should work without CAPTCHA
      expect(ClientAuthService.loginAnonymously).toHaveBeenCalled();
    });

    it('should maintain existing error handling with CAPTCHA enabled', async () => {
      const mockToast = vi.spyOn(toast, 'error');
      vi.spyOn(DatabaseService, 'isBlacklisted').mockResolvedValue({
        data: {
          created_at: 'timestamp',
          fingerprint: 'fingerprint',
          id: '1',
        },
      } as any);

      // Mock CAPTCHA being enabled
      vi.stubEnv('VITE_CAPTCHA_ENABLED', 'true');

      const { result } = renderHook(() => useLogins(), {
        wrapper: TestWithQueryContext,
      });

      result.current.loginAnonymouslyMutation.mutate();

      await waitFor(() => {
        expect(result.current.loginAnonymouslyMutation.isError).toBe(true);
      });

      // Error handling should work the same with CAPTCHA enabled
      expect(result.current.loginAnonymouslyMutation.error).toEqual(
        new CustomError(CustomErrorType.UNAUTHORIZED, 'User is banned'),
      );
      expect(mockToast).toHaveBeenCalledWith('User is banned');
    });
  });
});
