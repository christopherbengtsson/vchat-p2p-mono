import type { WebRTCStateHandlers } from '../model/WebRTCStateHandlers.js';

const addLocalStream = (pc: RTCPeerConnection, localStream: MediaStream) => {
  for (const track of localStream.getTracks()) {
    pc.addTrack(track, localStream);
  }
};

const addCanvasStream = (
  pc: RTCPeerConnection,
  webRTCState: WebRTCStateHandlers,
  canvasStream: MediaStream,
) => {
  for (const track of canvasStream.getTracks()) {
    const canvasSender = pc.addTrack(track, canvasStream);
    webRTCState.setState({ canvasSender });
  }
};

const removeCanvasStream = (
  pc: RTCPeerConnection,
  webRTCState: WebRTCStateHandlers,
) => {
  const { canvasSender } = webRTCState.getState();

  if (canvasSender) {
    const track = canvasSender.track;
    if (track) {
      track.stop();
    }

    pc.removeTrack(canvasSender);

    webRTCState.setState({ canvasSender: null });
  }
};

export const AdHocService = {
  addLocalStream,
  addCanvasStream,
  removeCanvasStream,
};
