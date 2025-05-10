// TODO: TURN server, can we detect when error is due to lack of TURN?
export const webRTCConfig: RTCConfiguration = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
} as const;
