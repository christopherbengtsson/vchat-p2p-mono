import type { WebRTCStateDto } from '../model/WebRTCStateDto.js';
import type { WebRTCStateHandlers } from '../model/WebRTCStateHandlers.js';

const initialState: WebRTCStateDto = {
  makingOffer: false,
  ignoreOffer: false,
  isSettingRemoteAnswerPending: false,
  canvasSender: null,
  remoteVideoChatStreamId: null,

  injectables: null,
};

const create = (): WebRTCStateHandlers => {
  let state = { ...initialState };

  return {
    getState: () => ({ ...state }),
    setState: (newState: Partial<WebRTCStateDto>) => {
      if (newState.injectables && state.injectables) {
        newState = {
          ...newState,
          injectables: {
            ...state.injectables,
            ...newState.injectables,
          },
        };
      }

      state = { ...state, ...newState };
    },
  };
};

export const WebRTCStateService = {
  create,
};
