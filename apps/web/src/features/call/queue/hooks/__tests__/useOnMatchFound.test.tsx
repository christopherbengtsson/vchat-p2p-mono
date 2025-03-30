import { generatePath } from 'react-router';
import { renderHook } from '@testing-library/react';
import type { VChatSocket } from '@mono/fe-dto';
import { RoutePath } from '@/RoutePath';
import { useOnMatchFound } from '../useOnMatchFound';

const mockNavigate = vi.fn();

vi.mock('react-router', async () => {
  const actualRouter = await vi.importActual('react-router');
  return {
    ...actualRouter,
    useNavigate: () => mockNavigate,
    generatePath: (path: string, params: Record<string, string>) =>
      path.replace(':roomId', params.roomId),
  };
});

describe('useOnMatchFound', () => {
  const onMock = vi.fn();
  const offMock = vi.fn();

  const mockSocket = {
    on: onMock,
    off: offMock,
  } as unknown as VChatSocket;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set up match-found event listener', () => {
    renderHook(() => useOnMatchFound(mockSocket as unknown as VChatSocket));

    expect(mockSocket.on).toHaveBeenCalledWith(
      'match-found',
      expect.any(Function),
    );
  });

  it('should clean up event listener on unmount', () => {
    const { unmount } = renderHook(() =>
      useOnMatchFound(mockSocket as unknown as VChatSocket),
    );

    unmount();

    expect(mockSocket.off).toHaveBeenCalledWith('match-found');
  });

  it('should navigate to in-call page when match is found', () => {
    renderHook(() => useOnMatchFound(mockSocket as unknown as VChatSocket));

    const matchFoundCallback = onMock.mock.calls[0][1];

    matchFoundCallback(
      'room-123',
      'partner-socket-123',
      'partner-user-123',
      true,
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      generatePath(RoutePath.IN_CALL, {
        roomId: 'room-123',
      }),
      {
        state: {
          partnerSocketId: 'partner-socket-123',
          partnerUserId: 'partner-user-123',
          isPolite: true,
        },
      },
    );
  });

  it('should do nothing if socket is null', () => {
    renderHook(() => useOnMatchFound(null));

    expect(mockSocket.on).not.toHaveBeenCalled();
  });
});
