import { WebRTCState } from '../WebRTCState';

describe('WebRTCState', () => {
  it('should create initial state with default values', () => {
    const state = WebRTCState.create();

    expect(state.getState()).toEqual({
      makingOffer: false,
      ignoreOffer: false,
      canvasSender: null,
      remoteVideoChatStreamId: null,
    });
  });

  it('should update state partially while preserving other values', () => {
    const state = WebRTCState.create();

    state.setState({ makingOffer: true });

    expect(state.getState()).toEqual({
      makingOffer: true,
      ignoreOffer: false,
      canvasSender: null,
      remoteVideoChatStreamId: null,
    });
  });

  it('should update multiple state properties at once', () => {
    const state = WebRTCState.create();
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
