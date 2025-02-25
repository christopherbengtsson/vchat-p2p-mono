import { WebRTCStateService } from '../WebRTCStateService.js';

describe('WebRTCStateService', () => {
  it('should create initial state with default values', () => {
    const state = WebRTCStateService.create();

    expect(state.getState()).toEqual({
      makingOffer: false,
      ignoreOffer: false,
      canvasSender: null,
      remoteVideoChatStreamId: null,
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
    });
  });
});
