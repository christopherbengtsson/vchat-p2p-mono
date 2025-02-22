import { Assert } from '../../../../common/utils/Assert';
import { Observables, WebRTCParams } from './types';
import { WebRTCStateHandlers } from './WebRTCState';

const _handleIceCandidate = (
  event: RTCPeerConnectionIceEvent,
  observables: Observables,
) => {
  Assert.isDefined(observables.socket);
  Assert.isDefined(observables.roomId);
  Assert.isDefined(observables.partnerSocketId);

  if (event.candidate) {
    observables.socket.emit(
      'peer-message',
      { candidate: event.candidate },
      observables.roomId,
      observables.partnerSocketId,
    );
  }
};

const _handleTrackEvent = (
  event: RTCTrackEvent,
  webRTCState: WebRTCStateHandlers,
  { setters, injectables }: WebRTCParams,
) => {
  event.track.onunmute = () => {
    const remoteStream = event.streams[0];
    const streamId = remoteStream.id;

    const { remoteVideoChatStreamId } = webRTCState.getState();

    if (!remoteVideoChatStreamId) {
      webRTCState.setState({ remoteVideoChatStreamId: streamId });
      setters.setRemoteStream(remoteStream);
    } else if (remoteVideoChatStreamId !== streamId) {
      injectables?.setRemoteCanvasStream?.(remoteStream);
    }
  };
};

const _handleIceConnectionStateChange = (pc: RTCPeerConnection) => {
  if (pc.iceConnectionState === 'failed') {
    pc.restartIce();
  }
};

const _handleNegotiationNeeded = async (
  pc: RTCPeerConnection,
  { setState }: WebRTCStateHandlers,
  { socket, roomId, partnerSocketId }: Observables,
) => {
  Assert.isDefined(roomId, 'roomId is not defined');
  Assert.isDefined(partnerSocketId, 'partnerId is not defined');
  try {
    setState({ makingOffer: true });

    await pc.setLocalDescription();

    Assert.isDefined(socket, 'socket is not defined');
    socket.emit(
      'peer-message',
      { description: pc.localDescription },
      roomId,
      partnerSocketId,
    );
  } catch (err) {
    console.error(err);
  } finally {
    setState({ makingOffer: false });
  }
};

const setup = (
  pc: RTCPeerConnection,
  params: WebRTCParams,
  webRTCState: WebRTCStateHandlers,
) => {
  pc.onnegotiationneeded = () =>
    _handleNegotiationNeeded(pc, webRTCState, params.observables);
  pc.oniceconnectionstatechange = () => _handleIceConnectionStateChange(pc);
  pc.onicecandidate = (ev) => _handleIceCandidate(ev, params.observables);
  pc.ontrack = (ev) => _handleTrackEvent(ev, webRTCState, params);
};

export const PeerConnectionHandlers = {
  setup,
};
