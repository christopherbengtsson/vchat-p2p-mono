import type { MockInstance } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { toast } from 'sonner';
import { Assert, InviteData } from '@mono/common-dto';
import { WebRTCService } from '@mono/fe-webrtc';
import { RoutePath } from '@/RoutePath';
import { RootStore } from '@/stores/RootStore';
import { FeatureFlagUtil } from '@/common/utils/FeatureFlagUtil';
import { RouterStateUtil } from '@/common/utils/RouterStateUtil';
import {
  TestWithCallStoreContext,
  TestWithQueryClientProvider,
  TestWithRootStoreContext,
} from '@/__mocks__/TestFixtures';
import { InCallContainer } from '../InCallContainer';
import { CallStore } from '../../../store/CallStore';
import type { CallStoreParams } from '../../model/CallStoreParams';

const routerState: CallStoreParams = {
  partnerSocketId: 'socket-123',
  partnerUserId: 'user-123',
  isPolite: true,
  roomId: 'room-123',
};

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actualRouter = await vi.importActual('react-router');
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
    rootStore.contentModerationStore.modelStatus = 'loading';

    callStore = new CallStore(routerState);

    mockCloseFn = vi.fn();
    mockWebRTCInstance = {
      isConnecting: vi.fn().mockReturnValue(false),
      isConnected: vi.fn().mockReturnValue(true),
      sendMessage: vi.fn().mockReturnValue(true),
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
    expect(screen.getByRole('button', { name: 'Open Chat' })).toBeVisible();
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

  describe('content moderation', () => {
    beforeEach(() => {
      rootStore.contentModerationStore.modelStatus = 'ready';
    });

    it('should show dialog when partner sends NSFW content', async () => {
      renderTestee();

      // Initially, no NSFW overlay should be present
      expect(
        screen.queryByTestId('nsfw-warning-overlay'),
      ).not.toBeInTheDocument();

      // Simulate NSFW content detection
      act(() => {
        rootStore.contentModerationStore.handleNSFWDetection({
          probability: 1,
          timestamp: Date.now(),
        });
      });

      // The NSFW overlay should now be visible
      await waitFor(() =>
        expect(
          screen.queryByTestId('nsfw-warning-overlay'),
        ).toBeInTheDocument(),
      );
    });

    it('should be possible to report NSFW content', async () => {
      const user = userEvent.setup();
      renderTestee();

      // Simulate NSFW content detection
      act(() => {
        rootStore.contentModerationStore.handleNSFWDetection({
          probability: 0.9,
          timestamp: Date.now(),
        });
      });

      // The NSFW overlay should be visible
      await waitFor(() =>
        expect(
          screen.queryByTestId('nsfw-warning-overlay'),
        ).toBeInTheDocument(),
      );

      // Find and click the Report button
      const reportButton = screen.getByRole('button', {
        name: /block and report/i,
      });
      await user.click(reportButton);

      expect(mockCloseFn).toHaveBeenCalledOnce();
      expect(rootStore.contentModerationStore.remoteStreamNSFW).toBe(false);
    });

    it('should allow continuing the call after NSFW detection', async () => {
      const user = userEvent.setup();
      renderTestee();

      // Simulate NSFW content detection
      act(() => {
        rootStore.contentModerationStore.handleNSFWDetection({
          probability: 0.8,
          timestamp: Date.now(),
        });
      });

      // The NSFW overlay should be visible
      await waitFor(() =>
        expect(
          screen.queryByTestId('nsfw-warning-overlay'),
        ).toBeInTheDocument(),
      );

      // Find and click the Continue button
      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() =>
        expect(
          screen.queryByTestId('nsfw-warning-overlay'),
        ).not.toBeInTheDocument(),
      );

      expect(rootStore.contentModerationStore.ignoreDetectedNSFW).toBe(true);
    });

    it('should end call when selecting "End Call" after NSFW detection', async () => {
      const user = userEvent.setup();
      renderTestee();

      // Simulate NSFW content detection
      act(() => {
        rootStore.contentModerationStore.handleNSFWDetection({
          probability: 0.9,
          timestamp: Date.now(),
        });
      });

      // The NSFW overlay should be visible
      await waitFor(() =>
        expect(
          screen.queryByTestId('nsfw-warning-overlay'),
        ).toBeInTheDocument(),
      );

      // Find and click the End Call button
      const endCallButton = screen.getByRole('button', { name: /end call/i });
      await user.click(endCallButton);

      // Verify that the call was ended and NSFW state was reset
      expect(mockCloseFn).toHaveBeenCalled();
      expect(rootStore.contentModerationStore.remoteStreamNSFW).toBe(false);
    });

    it('should not show NSFW overlay when model status is error', async () => {
      renderTestee();

      // Set model status to error
      act(() => {
        rootStore.contentModerationStore.setModelStatus('error');
      });

      // Simulate NSFW content detection
      act(() => {
        rootStore.contentModerationStore.handleNSFWDetection({
          probability: 1,
          timestamp: Date.now(),
        });
      });

      // The NSFW overlay should not be visible due to error status
      await waitFor(() =>
        expect(
          screen.queryByTestId('nsfw-warning-overlay'),
        ).not.toBeInTheDocument(),
      );
    });
  });

  describe('in-call chat', () => {
    it('should toggle chat open and closed when clicking chat button', async () => {
      const user = userEvent.setup();
      renderTestee();

      // Initially chat is closed
      const openChatButton = screen.getByRole('button', { name: 'Open Chat' });
      expect(openChatButton).toBeVisible();

      // Open chat
      await user.click(openChatButton);

      // Verify input is visible and focused
      const input = screen.getByPlaceholderText('Type a message...');
      expect(input).toBeVisible();
      expect(input).toHaveFocus();

      // Close chat by clicking the same button
      await user.click(openChatButton);

      // Verify chat is closed (input no longer has focus)
      expect(input).not.toHaveFocus();
    });

    it('should focus input when opening chat', async () => {
      const user = userEvent.setup();
      renderTestee();

      const chatButton = screen.getByRole('button', { name: 'Open Chat' });

      // Open chat
      await user.click(chatButton);

      const input = screen.getByPlaceholderText('Type a message...');
      expect(input).toHaveFocus();

      // Close and reopen
      await user.click(chatButton);
      await user.click(chatButton);

      // Focus should be restored
      expect(input).toHaveFocus();
    });

    it('should send a message when clicking send button', async () => {
      const user = userEvent.setup();
      renderTestee();

      // Open chat
      await user.click(screen.getByRole('button', { name: 'Open Chat' }));

      const input = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByRole('button', { name: 'Send Message' });

      // Type message
      await user.type(input, 'Hello partner!');

      // Send message
      await user.click(sendButton);

      // Verify WebRTC sendMessage was called with correct data
      expect(mockWebRTCInstance.sendMessage).toHaveBeenCalledWith(
        {
          type: 'CHAT',
          data: {
            message: 'Hello partner!',
            senderSocketId: 'socketId',
            senderUserId: 'userId',
            timestamp: expect.any(Number),
          },
        },
        expect.any(Function),
      );

      // Verify message appears in chat
      expect(screen.getByText('Hello partner!')).toBeVisible();

      // Verify input is cleared
      expect(input).toHaveValue('');
    });

    it('should send a message when pressing Enter key', async () => {
      const user = userEvent.setup();
      renderTestee();

      await user.click(screen.getByRole('button', { name: 'Open Chat' }));

      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, 'Quick message{Enter}');

      expect(mockWebRTCInstance.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CHAT',
          data: expect.objectContaining({
            message: 'Quick message',
          }),
        }),
        expect.any(Function),
      );

      expect(screen.getByText('Quick message')).toBeVisible();
      expect(input).toHaveValue('');
    });

    it('should trim whitespace from messages before sending', async () => {
      const user = userEvent.setup();
      renderTestee();

      await user.click(screen.getByRole('button', { name: 'Open Chat' }));

      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, '  Trimmed message  {Enter}');

      expect(mockWebRTCInstance.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CHAT',
          data: expect.objectContaining({
            message: 'Trimmed message',
          }),
        }),
        expect.any(Function),
      );
    });

    it('should disable send button when message is empty or whitespace only', async () => {
      const user = userEvent.setup();
      renderTestee();

      await user.click(screen.getByRole('button', { name: 'Open Chat' }));

      const sendButton = screen.getByRole('button', { name: 'Send Message' });

      // Initially disabled (empty)
      expect(sendButton).toBeDisabled();

      const input = screen.getByPlaceholderText('Type a message...');

      // Type whitespace only
      await user.type(input, '   ');
      expect(sendButton).toBeDisabled();

      // Clear and type actual message
      await user.clear(input);
      await user.type(input, 'Real message');
      expect(sendButton).toBeEnabled();

      // Clear again
      await user.clear(input);
      expect(sendButton).toBeDisabled();
    });

    it('should not send message when pressing Enter with empty input', async () => {
      const user = userEvent.setup();
      renderTestee();

      await user.click(screen.getByRole('button', { name: 'Open Chat' }));

      const input = screen.getByPlaceholderText('Type a message...');

      // Press Enter with empty input
      await user.click(input);
      await user.keyboard('{Enter}');

      expect(mockWebRTCInstance.sendMessage).not.toHaveBeenCalled();
    });

    it('should enforce maximum message length of 1000 characters', async () => {
      const user = userEvent.setup();
      renderTestee();

      await user.click(screen.getByRole('button', { name: 'Open Chat' }));

      const input = screen.getByPlaceholderText(
        'Type a message...',
      ) as HTMLInputElement;

      // Verify maxLength attribute is set
      expect(input).toHaveAttribute('maxLength', '1000');

      // Try to paste more than 1000 characters
      const longMessage = 'a'.repeat(1500);
      await user.click(input);
      await user.paste(longMessage);

      // Input should be truncated to 1000
      expect(input.value.length).toBe(1000);
    });

    it('should show error toast when message fails to send', async () => {
      const user = userEvent.setup();

      // Mock sendMessage to return false (failure)
      mockWebRTCInstance.sendMessage.mockReturnValue(false);

      renderTestee();

      await user.click(screen.getByRole('button', { name: 'Open Chat' }));

      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, 'Failed message{Enter}');

      // Message should NOT be added to chat
      expect(screen.queryByText('Failed message')).not.toBeInTheDocument();

      // Input should still contain the message (not cleared)
      expect(input).toHaveValue('Failed message');
    });

    it('should call onError callback when WebRTC reports error', async () => {
      const user = userEvent.setup();
      const toastErrorSpy = vi.spyOn(toast, 'error');

      // Mock sendMessage to call onError callback
      mockWebRTCInstance.sendMessage.mockImplementation(
        (_message: any, onError: () => void) => {
          onError();
          return true;
        },
      );

      renderTestee();

      await user.click(screen.getByRole('button', { name: 'Open Chat' }));

      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, 'Error message{Enter}');

      // Verify error callback triggers toast
      expect(toastErrorSpy).toHaveBeenCalledWith('Failed to send message');
    });

    it('should clear notifications when opening chat', async () => {
      const user = userEvent.setup();
      renderTestee();

      // Add some notification messages
      act(() => {
        callStore.addChatMessage({
          message: 'Notification 1',
          senderSocketId: 'socket-123',
          senderUserId: 'user-123',
          timestamp: Date.now(),
        });
        callStore.addChatMessage({
          message: 'Notification 2',
          senderSocketId: 'socket-123',
          senderUserId: 'user-123',
          timestamp: Date.now() + 1,
        });
      });

      expect(callStore.notificationMessages).toHaveLength(2);

      // Open chat
      await user.click(screen.getByRole('button', { name: 'Open Chat' }));

      // Notification messages should be cleared
      await waitFor(() => {
        expect(callStore.notificationMessages).toHaveLength(0);
      });

      // But chat messages should still be there
      expect(callStore.chatMessages).toHaveLength(2);
    });
  });
});
