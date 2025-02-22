import { webRTCConfig } from '../config';

const create = () => new RTCPeerConnection(webRTCConfig);

const close = (pc: RTCPeerConnection) => {
  pc.close();
};

export const PeerConnection = {
  create,
  close,
};
