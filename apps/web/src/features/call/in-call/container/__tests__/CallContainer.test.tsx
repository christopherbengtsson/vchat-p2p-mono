import type { MockInstance } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { Assert } from '@mono/common-dto';
import { WebRTCService } from '@mono/fe-webrtc';
import { RouterStateUtil } from '@/common/utils/RouterStateUtil';
import { mediaStore } from '@/stores/MediaStore';
import {
  TestWithCallStoreContext,
  TestWithRootStoreContext,
} from '@/__mocks__/TestFixtures';
import { CallContainer, MIN_MATCH_DISPLAY_DURATION } from '../CallContainer';
import { CallStore } from '../../../store/CallStore';
import type { CallStoreParams } from '../../model/CallStoreParams';
import { InCallService } from '../../service/InCallService';

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

// Mock InCallContainer to simplify testing
vi.mock('../InCallContainer', () => ({
  InCallContainer: () => <div data-testid="in-call-container"></div>,
}));

describe('CallContainer', () => {
  let callStore: CallStore;
  let mockWebRTCInstance: any;
  let mockCloseFn: MockInstance;

  const renderTestee = () => {
    return render(<CallContainer routerState={routerState} />, {
      wrapper: ({ children }) => (
        <TestWithRootStoreContext>
          <TestWithCallStoreContext callStore={callStore}>
            {children}
          </TestWithCallStoreContext>
        </TestWithRootStoreContext>
      ),
    });
  };

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

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
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('should find match on mount', () => {
    mediaStore.localCallStream = {} as MediaStream;
    const serviceSpy = vi.spyOn(InCallService, 'initNewCall');
    const webRtcSpy = vi.spyOn(WebRTCService, 'create');
    renderTestee();

    expect(serviceSpy).toHaveBeenCalledOnce();
    expect(serviceSpy).toHaveBeenCalledWith({
      localStream: mediaStore.localCallStream,
      roomId: routerState.roomId,
      partnerSocketId: routerState.partnerSocketId,
      isPolite: routerState.isPolite,
      callStore,
      socketStore: expect.anything(),
    });

    expect(webRtcSpy).toHaveBeenCalledOnce();
    expect(RouterStateUtil.clear).toHaveBeenCalledOnce();
  });

  it('should render match message on mount', () => {
    renderTestee();

    expect(
      screen.getByText(`Match with ${routerState.partnerSocketId}`),
    ).toBeVisible();
  });

  it('should display match message for at least n seconds', async () => {
    renderTestee();

    expect(callStore.connectionEstablished).toBe(false);

    act(() => callStore.setIsConnected(true));

    expect(
      screen.getByText(`Match with ${routerState.partnerSocketId}`),
    ).toBeVisible();

    act(() => vi.advanceTimersByTime(MIN_MATCH_DISPLAY_DURATION));

    expect(
      screen.queryByText(`Match with ${routerState.partnerSocketId}`),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('in-call-container')).toBeVisible();
  });

  it('should close WebRTC connection when component unmounts', () => {
    const { unmount } = renderTestee();
    unmount();

    expect(mockCloseFn).toHaveBeenCalled();
  });
});
