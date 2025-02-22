import { useMemo } from 'react';
import { WebRtc } from './main';
import { WebRTCParams } from './types';

export const useWebRTC = (params: WebRTCParams) => {
  const webRTC = useMemo(() => WebRtc.create(params), []);

  return {
    ...webRTC,
  };
};
