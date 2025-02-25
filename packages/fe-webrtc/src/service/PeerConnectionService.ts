import { webRTCConfig } from '../config/webRTCConfig.js';

const create = () => new RTCPeerConnection(webRTCConfig);

const close = (pc: RTCPeerConnection) => {
  pc.close();
};

export const PeerConnectionService = {
  create,
  close,
};
