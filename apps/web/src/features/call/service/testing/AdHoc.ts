import { WebRTCStateHandlers } from './WebRTCState';

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

export const AdHoc = {
  addCanvasStream,
  removeCanvasStream,
};
