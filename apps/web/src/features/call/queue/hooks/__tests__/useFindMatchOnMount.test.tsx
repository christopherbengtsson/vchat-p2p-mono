import { renderHook, waitFor } from '@testing-library/react';
import type { ClientToServerEvents } from '@mono/common-dto';
import type { VChatSocket } from '@mono/fe-dto';
import * as RouterStateUtil from '@/common/utils/RouterStateUtil';
import * as useRootStore from '@/stores/hooks/useRootStore';
import { RoutePath } from '@/RoutePath';
import { CallStore } from '@/features/call/store/CallStore';
import { RootStore } from '@/stores/RootStore';
import { TestWithQueryContext } from '@/testUtils';
import { noop } from '@/common/utils/noop';
import { useFindMatchOnMount } from '../useFindMatchOnMount';
import type { CallLocation } from '../../model/CallLocationState';
import * as useFetchUser from '../../../../home/hooks/useFetchUser';

const mockNavigate = vi.fn();
let mockLocation: CallLocation = {
  state: { findMatch: true },
};

vi.mock('react-router', async () => {
  const actualRouter = await vi.importActual('react-router');
  return {
    ...actualRouter,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});

vi.mock('../../../../home/hooks/useFetchUser', () => ({
  useFetchUser: () => ({
    user: {
      id: 'userId',
      ignoredUserIds: ['ignored-user-1', 'ignored-user-2'],
    },
    isPending: false,
  }),
}));

describe('useFindMatchOnMount', () => {
  const mockSocket = {
    emit: vi.fn<(event: keyof ClientToServerEvents, ...args: any[]) => void>(),
  } as unknown as VChatSocket;

  beforeEach(() => {
    vi.spyOn(RouterStateUtil.RouterStateUtil, 'clear').mockImplementation(
      vi.fn(),
    );
    mockLocation = { state: { findMatch: true } };

    vi.spyOn(useRootStore, 'useRootStore').mockReturnValue({
      authStore: { userId: 'userId' },
    } as unknown as RootStore);

    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should emit find-match when conditions are met', async () => {
    renderHook(
      () =>
        useFindMatchOnMount({
          socket: mockSocket,
          socketId: 'socket-123',
          userId: 'user-123',
        }),
      { wrapper: TestWithQueryContext },
    );

    await waitFor(() =>
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'find-match',
        'socket-123',
        'user-123',
        ['ignored-user-1', 'ignored-user-2'],
      ),
    );

    expect(RouterStateUtil.RouterStateUtil.clear).toHaveBeenCalled();
  });

  it('should wait for timeout before emitting when slow option is true', () => {
    mockLocation = { state: { findMatch: true, slow: true } };

    renderHook(
      () =>
        useFindMatchOnMount({
          socket: mockSocket,
          socketId: 'socket-123',
          userId: 'user-123',
        }),
      { wrapper: TestWithQueryContext },
    );

    expect(mockSocket.emit).not.toHaveBeenCalled();

    vi.advanceTimersByTime(CallStore.NEW_MATCH_TIMEOUT);

    expect(mockSocket.emit).toHaveBeenCalledWith(
      'find-match',
      'socket-123',
      'user-123',
      ['ignored-user-1', 'ignored-user-2'],
    );
    expect(RouterStateUtil.RouterStateUtil.clear).toHaveBeenCalled();
  });

  it('should navigate to home if findMatch is not in state', () => {
    mockLocation = { state: null };

    renderHook(
      () =>
        useFindMatchOnMount({
          socket: mockSocket,
          socketId: 'socket-123',
          userId: 'user-123',
        }),
      { wrapper: TestWithQueryContext },
    );

    expect(mockNavigate).toHaveBeenCalledWith(RoutePath.HOME, {
      replace: true,
    });
    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  it('should navigate to home if socketId is missing', () => {
    renderHook(
      () =>
        useFindMatchOnMount({
          socket: mockSocket,
          socketId: null,
          userId: 'user-123',
        }),
      { wrapper: TestWithQueryContext },
    );

    expect(mockSocket.emit).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(RoutePath.HOME, {
      replace: true,
    });
  });

  it('should clean up timeout on unmount', () => {
    mockLocation = { state: { findMatch: true, slow: true } };
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    const { unmount } = renderHook(
      () =>
        useFindMatchOnMount({
          socket: mockSocket,
          socketId: 'socket-123',
          userId: 'user-123',
        }),
      { wrapper: TestWithQueryContext },
    );

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('should not be possible to proceed with unreasonable amount of ignored users', async () => {
    vi.spyOn(console, 'error').mockImplementation(noop);

    vi.spyOn(useFetchUser, 'useFetchUser').mockReturnValue({
      isPending: false,
      user: { ignoredUserIds: new Array<string>(1001).fill('userId') },
      error: null,
      isError: false,
    });

    renderHook(
      () =>
        useFindMatchOnMount({
          socket: mockSocket,
          socketId: 'socket-123',
          userId: 'user-123',
        }),
      { wrapper: TestWithQueryContext },
    );

    expect(mockSocket.emit).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(RoutePath.HOME, {
      replace: true,
    });
  });
});
