import type { MockInstance } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { toast } from 'sonner';
import { Assert, InviteData } from '@mono/common-dto';
import { WebRTCService } from '@mono/fe-webrtc';
import { RootStore } from '@/stores/RootStore';
import { RouterStateUtil } from '@/common/utils/RouterStateUtil';
import {
  TestWithCallStoreContext,
  TestWithQueryClientProvider,
  TestWithRootStoreContext,
} from '@/__mocks__/TestFixtures';
import { InCallContainer } from '../InCallContainer';
import { CallStore } from '../../../store/CallStore';
import type { CallStoreParams } from '../../model/CallStoreParams';
import { FeatureFlagUtil } from '../../../../../common/utils/FeatureFlagUtil';
import { RoutePath } from '../../../../../RoutePath';

const routerState: CallStoreParams = {
  partnerSocketId: 'socket-123',
  partnerUserId: 'user-123',
  isPolite: true,
  roomId: 'room-123',
};

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actualRouter = await vi.importActual('react-router-dom');
  return { ...actualRouter, useNavigate: () => mockNavigate };
});

vi.mock('@/features/game/game-engine/container/GameEngineContainer', () => ({
  GameEngineContainer: vi.fn(() => (
    <div data-testid="mock-game-engine-container">GameEngineContainer</div>
  )),
}));
vi.mock('@mono/common-supabase');
vi.mock('@/common/clients/supabase', () => ({
  SupabaseClient: {
    instance: {
      auth: {
        getSession: vi
          .fn()
          .mockResolvedValue({ data: { session: { user: { id: 'userId' } } } }),
        onAuthStateChange: vi.fn(),
      },
    },
  },
}));

describe('InCallContainer', () => {
  let rootStore: RootStore;
  let callStore: CallStore;

  let mockWebRTCInstance: any;
  let mockCloseFn: MockInstance;

  const renderTestee = () => {
    return render(<InCallContainer />, {
      wrapper: ({ children }) => (
        <TestWithQueryClientProvider>
          <TestWithRootStoreContext rootStore={rootStore}>
            <TestWithCallStoreContext callStore={callStore}>
              {children}
            </TestWithCallStoreContext>
          </TestWithRootStoreContext>
        </TestWithQueryClientProvider>
      ),
    });
  };

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    rootStore = new RootStore();
    rootStore.socketStore.socket = {
      id: 'socketId',
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    } as any;
    rootStore.authStore.session = {
      user: { id: 'userId' },
    } as any;
    rootStore.mediaStore.localCallStream = {
      getVideoTracks: vi.fn().mockReturnValue([{ enabled: true }]),
      getAudioTracks: vi.fn().mockReturnValue([{ enabled: true }]),
      getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
    } as any;

    callStore = new CallStore(routerState);

    mockCloseFn = vi.fn();
    mockWebRTCInstance = {
      isConnecting: vi.fn().mockReturnValue(false),
      isConnected: vi.fn().mockReturnValue(true),
      sendMessage: vi.fn(),
      addCanvasStream: vi.fn(),
      removeCanvasStream: vi.fn(),
      addInjectable: vi.fn(),
      removeInjectable: vi.fn(),
      close: mockCloseFn,
    };
    vi.spyOn(WebRTCService, 'create').mockReturnValue(mockWebRTCInstance);
    vi.spyOn(WebRTCService, 'get').mockReturnValue(mockWebRTCInstance);

    vi.spyOn(RouterStateUtil, 'clear').mockImplementation(vi.fn());
    vi.spyOn(Assert, 'isDefined').mockImplementation(() => vi.fn());
    vi.spyOn(FeatureFlagUtil, 'isGamesEnabled').mockReturnValue(true);
    vi.spyOn(toast, 'success');
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    cleanup();
  });

  it('should render all call components', () => {
    renderTestee();

    expect(screen.getByRole('button', { name: 'Report user' })).toBeVisible();

    expect(screen.getByLabelText('Your video')).toBeVisible();
    expect(screen.getByLabelText("Partner's video")).toBeVisible();

    expect(
      screen.getByRole('button', { name: 'Turn camera off' }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Turn microphone off' }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Invite to game' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'End call' })).toBeVisible();
  });

  it('should visualize video and microphone toggles', async () => {
    const user = userEvent.setup();

    renderTestee();

    await user.click(screen.getByRole('button', { name: 'Turn camera off' }));
    expect(
      screen.getByRole('button', { name: 'Turn camera on' }),
    ).toBeVisible();
    expect(screen.getByLabelText('Your camera is off')).toBeVisible();

    act(() => {
      callStore.setPartnerVideoEnabled(false);
    });

    expect(screen.getByLabelText("Partner's camera is off icon")).toBeVisible();

    await user.click(
      screen.getByRole('button', { name: 'Turn microphone off' }),
    );
    expect(
      screen.getByRole('button', { name: 'Turn microphone on' }),
    ).toBeVisible();
  });

  it('should not render game initiator when feature flag is disabled', () => {
    vi.mocked(FeatureFlagUtil.isGamesEnabled).mockReturnValue(false);
    renderTestee();

    expect(
      screen.queryByRole('button', { name: 'Invite to game' }),
    ).not.toBeInTheDocument();
  });

  it('disposes resources on end call', async () => {
    const user = userEvent.setup();

    const routerStateSpy = vi
      .spyOn(RouterStateUtil, 'clear')
      .mockImplementation(vi.fn());
    renderTestee();

    await user.click(screen.getByRole('button', { name: 'End call' }));

    expect(mockCloseFn).toHaveBeenCalledOnce();
    expect(routerStateSpy).toHaveBeenCalledOnce();
    expect(mockNavigate).toHaveBeenCalledOnce();
    expect(mockNavigate).toHaveBeenCalledWith(RoutePath.CALL, {
      state: {
        findMatch: true,
        slow: true,
      },
    });
  });

  describe('report user', () => {
    it('should open report user dialog', async () => {
      const user = userEvent.setup();

      renderTestee();

      await user.click(screen.getByRole('button', { name: 'Report user' }));

      expect(
        screen.getByText(
          'Please let us know if you have encountered any inappropriate behavior from the user by reporting them.',
        ),
      ).toBeVisible();

      await user.click(screen.getByRole('button', { name: 'Cancel' }));
    });

    it('should end call if reporting user', async () => {
      const user = userEvent.setup();

      renderTestee();

      // Open dialog
      await user.click(screen.getByRole('button', { name: 'Report user' }));
      // Confirm report
      await user.click(screen.getByRole('button', { name: 'Report user' }));

      expect(mockCloseFn).toHaveBeenCalledOnce();
    });
  });

  describe('game invite', () => {
    it('should open game invite dialog', async () => {
      const user = userEvent.setup();
      const toastSpy = vi.spyOn(toast, 'success');

      renderTestee();

      await user.click(screen.getByRole('button', { name: 'Invite to game' }));

      expect(toastSpy).toHaveBeenCalledWith('Invitation sent!');
    });

    it('should be possible to send game invite', async () => {
      const user = userEvent.setup();
      const toastSpy = vi.spyOn(toast, 'success');

      renderTestee();

      await user.click(screen.getByRole('button', { name: 'Invite to game' }));

      expect(toastSpy).toHaveBeenCalledWith('Invitation sent!');
    });

    it('should display invite dialog on incoming invite', async () => {
      // Store callbacks registered via WebRTC's addInjectable
      type Callback = (inviteData: InviteData) => void;
      const mockedWebRTCCallbacks: Callback[] = [];

      mockWebRTCInstance.addInjectable.mockImplementation(
        (key: string, callback: Callback) => {
          if (key === 'handleIncomingInviteMessage') {
            mockedWebRTCCallbacks.push(callback);
          }
        },
      );

      renderTestee();

      act(() => {
        mockedWebRTCCallbacks.forEach((callback) => {
          callback({
            type: 'INVITE',
          });
        });
      });

      expect(screen.getByText('Wanna play a game?')).toBeVisible();
      expect(screen.getByRole('button', { name: 'Accept' })).toBeVisible();
      expect(screen.getByRole('button', { name: 'Decline' })).toBeVisible();
    });
  });
});
