import type { WebRTCStateDto } from './WebRTCStateDto.js';

export interface WebRTCStateHandlers {
  getState: () => WebRTCStateDto;
  setState: (newState: Partial<WebRTCStateDto>) => void;
}
