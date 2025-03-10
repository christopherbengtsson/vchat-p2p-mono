/* eslint-disable @typescript-eslint/no-empty-function */
import { InviteData, RoundData } from '@mono/common-dto';
import { WebRTCStateService } from '../WebRTCStateService.js';

describe('WebRTCStateService', () => {
  it('should create initial state with default values', () => {
    const state = WebRTCStateService.create();

    expect(state.getState()).toEqual({
      makingOffer: false,
      ignoreOffer: false,
      canvasSender: null,
      remoteVideoChatStreamId: null,
      injectables: null,
    });
  });

  it('should update state partially while preserving other values', () => {
    const state = WebRTCStateService.create();

    state.setState({ makingOffer: true });

    expect(state.getState()).toEqual({
      makingOffer: true,
      ignoreOffer: false,
      canvasSender: null,
      remoteVideoChatStreamId: null,
      injectables: null,
    });
  });

  it('should update multiple state properties at once', () => {
    const state = WebRTCStateService.create();
    const mockSender = {} as RTCRtpSender;

    state.setState({
      makingOffer: true,
      ignoreOffer: true,
      canvasSender: mockSender,
    });

    expect(state.getState()).toEqual({
      makingOffer: true,
      ignoreOffer: true,
      canvasSender: mockSender,
      remoteVideoChatStreamId: null,
      injectables: null,
    });
  });

  it('should properly initialize and update injectables', () => {
    const state = WebRTCStateService.create();
    const mockHandler = vi.fn();

    state.setState({
      injectables: {
        setRemoteCanvasStream: mockHandler,
      },
    });

    expect(state.getState().injectables?.setRemoteCanvasStream).toBe(
      mockHandler,
    );
  });

  it('should handle message handler arrays in injectables', () => {
    const state = WebRTCStateService.create();
    const inviteHandler1 = vi.fn((_data: InviteData) => {});
    const inviteHandler2 = vi.fn((_data: InviteData) => {});

    // Set initial handler
    state.setState({
      injectables: {
        handleIncomingInviteMessage: [inviteHandler1],
      },
    });

    expect(
      state.getState().injectables?.handleIncomingInviteMessage,
    ).toHaveLength(1);
    expect(state.getState().injectables?.handleIncomingInviteMessage?.[0]).toBe(
      inviteHandler1,
    );

    // Update with a new array of handlers
    state.setState({
      injectables: {
        handleIncomingInviteMessage: [inviteHandler1, inviteHandler2],
      },
    });

    expect(
      state.getState().injectables?.handleIncomingInviteMessage,
    ).toHaveLength(2);
    expect(state.getState().injectables?.handleIncomingInviteMessage).toContain(
      inviteHandler1,
    );
    expect(state.getState().injectables?.handleIncomingInviteMessage).toContain(
      inviteHandler2,
    );
  });

  it('should merge injectables with existing state', () => {
    const state = WebRTCStateService.create();
    const inviteHandler = vi.fn((_data: InviteData) => {});
    const gameRoundHandler = vi.fn((_data: RoundData) => {});
    const canvasStreamHandler = vi.fn((_stream: MediaStream) => {});

    // Add invite handler
    state.setState({
      injectables: {
        handleIncomingInviteMessage: [inviteHandler],
      },
    });

    // Add game round handler without affecting invite handler
    state.setState({
      injectables: {
        handleGameRoundMessage: [gameRoundHandler],
      },
    });

    // Verify both handlers are present
    expect(
      state.getState().injectables?.handleIncomingInviteMessage,
    ).toHaveLength(1);
    expect(state.getState().injectables?.handleGameRoundMessage).toHaveLength(
      1,
    );

    // Add canvas stream handler
    state.setState({
      injectables: {
        setRemoteCanvasStream: canvasStreamHandler,
      },
    });

    // Verify all handlers remain
    const finalState = state.getState();
    expect(finalState.injectables?.handleIncomingInviteMessage).toHaveLength(1);
    expect(finalState.injectables?.handleIncomingInviteMessage?.[0]).toBe(
      inviteHandler,
    );
    expect(finalState.injectables?.handleGameRoundMessage).toHaveLength(1);
    expect(finalState.injectables?.handleGameRoundMessage?.[0]).toBe(
      gameRoundHandler,
    );
    expect(finalState.injectables?.setRemoteCanvasStream).toBe(
      canvasStreamHandler,
    );
  });

  it('should replace existing handlers when setting the same injectable type', () => {
    const state = WebRTCStateService.create();
    const originalHandler = vi.fn((_stream: MediaStream) => {});
    const newHandler = vi.fn((_stream: MediaStream) => {});

    // Set initial handler
    state.setState({
      injectables: {
        setRemoteCanvasStream: originalHandler,
      },
    });

    // Replace with new handler
    state.setState({
      injectables: {
        setRemoteCanvasStream: newHandler,
      },
    });

    // Verify replacement
    expect(state.getState().injectables?.setRemoteCanvasStream).toBe(
      newHandler,
    );
    expect(state.getState().injectables?.setRemoteCanvasStream).not.toBe(
      originalHandler,
    );
  });
});
