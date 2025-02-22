export interface WebRTCState {
  makingOffer: boolean;
  ignoreOffer: boolean;
  canvasSender: RTCRtpSender | null;
  remoteVideoChatStreamId: string | null;
}
export interface WebRTCStateHandlers {
  getState: () => WebRTCState;
  setState: (newState: Partial<WebRTCState>) => void;
}

const initialState: WebRTCState = {
  makingOffer: false,
  ignoreOffer: false,
  canvasSender: null,
  remoteVideoChatStreamId: null,
};

const create = (): WebRTCStateHandlers => {
  let state = { ...initialState };

  return {
    getState: () => ({ ...state }),
    setState: (newState: Partial<WebRTCState>) => {
      state = { ...state, ...newState };
    },
  };
};

export const WebRTCState = {
  create,
};
