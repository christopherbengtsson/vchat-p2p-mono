import {
  InjectableHandler,
  Injectables,
  RemovableHandler,
} from '../model/Injectables.js';
import type { WebRTCStateHandlers } from '../model/WebRTCStateHandlers.js';

type ArrayKey = 'handleIncomingInviteMessage' | 'handleGameRoundMessage';

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

const addInjectable = <K extends keyof Injectables>(
  webRTCState: WebRTCStateHandlers,
  listener: K,
  callback: InjectableHandler<K>,
) => {
  const currentInjectables = webRTCState.getState().injectables || {};

  if (
    listener === 'handleIncomingInviteMessage' ||
    listener === 'handleGameRoundMessage'
  ) {
    const key = listener as ArrayKey;
    const currentListeners = currentInjectables[key] || [];

    webRTCState.setState({
      injectables: {
        ...currentInjectables,
        [listener]: [...(currentListeners ?? []), callback],
      },
    });
  } else {
    // Single value injectable
    webRTCState.setState({
      injectables: {
        ...currentInjectables,
        [listener]: callback,
      },
    });
  }
};

const removeInjectable = <K extends keyof Injectables>(
  webRTCState: WebRTCStateHandlers,
  listener: K,
  callback?: RemovableHandler<K>,
) => {
  const currentInjectables = webRTCState.getState().injectables || {};

  if (
    (listener === 'handleIncomingInviteMessage' ||
      listener === 'handleGameRoundMessage') &&
    callback
  ) {
    const key = listener as ArrayKey;

    const currentListeners = currentInjectables[key] || [];
    const updatedListeners = currentListeners.filter((cb) => cb !== callback);

    webRTCState.setState({
      injectables: {
        ...currentInjectables,
        [listener]: updatedListeners.length > 0 ? updatedListeners : undefined,
      },
    });
  } else {
    // For single-value injectables, explicitly set to null to remove it
    webRTCState.setState({
      injectables: {
        ...currentInjectables,
        [listener]: undefined,
      },
    });
  }
};

export const AdHocService = {
  addLocalStream,
  addCanvasStream,
  removeCanvasStream,
  addInjectable,
  removeInjectable,
};
