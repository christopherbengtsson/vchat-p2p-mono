import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import AxiosMockAdapter from 'axios-mock-adapter';
import type { AuthError } from '@supabase/supabase-js';
import { ClientAuthService } from '@mono/fe-supabase';
import { DatabaseService } from '@mono/common-supabase';
import { CustomError, CustomErrorType } from '@mono/common-dto';
import { useLogins } from '../useLogins';
import { TestWithQueryContext } from '../../../../testUtils';
import { axiosClient } from '../../../../common/clients/axios';

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
    axiosMock.onPost('/signature').reply(200, {
      fingerprint: 'fingerprint',
    });
  });

  afterEach(cleanup);

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
});
