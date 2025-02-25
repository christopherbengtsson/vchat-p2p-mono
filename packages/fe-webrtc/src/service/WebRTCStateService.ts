import type { WebRTCStateDto } from '../model/WebRTCStateDto.js';
import type { WebRTCStateHandlers } from '../model/WebRTCStateHandlers.js';

const initialState: WebRTCStateDto = {
  makingOffer: false,
  ignoreOffer: false,
  canvasSender: null,
  remoteVideoChatStreamId: null,
};

const create = (): WebRTCStateHandlers => {
  let state = { ...initialState };

  return {
    getState: () => ({ ...state }),
    setState: (newState: Partial<WebRTCStateDto>) => {
      state = { ...state, ...newState };
    },
  };
};

export const WebRTCStateService = {
  create,
};
