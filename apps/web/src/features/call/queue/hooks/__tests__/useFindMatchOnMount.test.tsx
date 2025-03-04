import { renderHook, waitFor } from '@testing-library/react';
import type { ClientToServerEvents } from '@mono/common-dto';
import type { VChatSocket } from '@mono/fe-dto';
import * as RouterStateUtil from '@/common/utils/RouterStateUtil';
import { RoutePath } from '@/RoutePath';
import { CallStore } from '@/features/call/store/CallStore';
import { useFindMatchOnMount, type CallLocation } from '../useFindMatchOnMount';

const mockNavigate = vi.fn();
let mockLocation: CallLocation = {
  state: { findMatch: true },
};

vi.mock('react-router-dom', async () => {
  const actualRouter = await vi.importActual('react-router-dom');
  return {
    ...actualRouter,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});

describe('useFindMatchOnMount', () => {
  const mockSocket = {
    emit: vi.fn<(event: keyof ClientToServerEvents, ...args: any[]) => void>(),
  } as unknown as VChatSocket;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(RouterStateUtil.RouterStateUtil, 'clear').mockImplementation(
      vi.fn(),
    );
    mockLocation = { state: { findMatch: true } };

    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should emit find-match when conditions are met', async () => {
    renderHook(() =>
      useFindMatchOnMount({
        socket: mockSocket,
        socketId: 'socket-123',
        userId: 'user-123',
      }),
    );

    await waitFor(() =>
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'find-match',
        'socket-123',
        'user-123',
      ),
    );

    expect(RouterStateUtil.RouterStateUtil.clear).toHaveBeenCalled();
  });

  it('should wait for timeout before emitting when slow option is true', () => {
    mockLocation = { state: { findMatch: true, slow: true } };

    renderHook(() =>
      useFindMatchOnMount({
        socket: mockSocket,
        socketId: 'socket-123',
        userId: 'user-123',
      }),
    );

    expect(mockSocket.emit).not.toHaveBeenCalled();

    vi.advanceTimersByTime(CallStore.NEW_MATCH_TIMEOUT);

    expect(mockSocket.emit).toHaveBeenCalledWith(
      'find-match',
      'socket-123',
      'user-123',
    );
    expect(RouterStateUtil.RouterStateUtil.clear).toHaveBeenCalled();
  });

  it('should navigate to home if findMatch is not in state', () => {
    mockLocation = { state: null };

    renderHook(() =>
      useFindMatchOnMount({
        socket: mockSocket,
        socketId: 'socket-123',
        userId: 'user-123',
      }),
    );

    expect(mockNavigate).toHaveBeenCalledWith(RoutePath.HOME, {
      replace: true,
    });
    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  it('should navigate to home if socketId is missing', () => {
    renderHook(() =>
      useFindMatchOnMount({
        socket: mockSocket,
        socketId: null,
        userId: 'user-123',
      }),
    );

    expect(mockNavigate).toHaveBeenCalledWith(RoutePath.HOME, {
      replace: true,
    });
    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  it('should clean up timeout on unmount', () => {
    mockLocation = { state: { findMatch: true, slow: true } };
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    const { unmount } = renderHook(() =>
      useFindMatchOnMount({
        socket: mockSocket,
        socketId: 'socket-123',
        userId: 'user-123',
      }),
    );

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
