import { Assert } from '@mono/common-dto';
import type { Observables } from '../model/Observables.js';
import type { Setters } from '../model/Setters.js';
import type { WebRTCParams } from '../model/WebRTCParams.js';
import type { WebRTCStateHandlers } from '../model/WebRTCStateHandlers.js';
import { DataChannelService } from './DataChannelService.js';

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
  { setters }: WebRTCParams,
) => {
  event.track.onunmute = () => {
    const remoteStream = event.streams[0];
    const streamId = remoteStream.id;

    const { remoteVideoChatStreamId, injectables } = webRTCState.getState();

    if (!remoteVideoChatStreamId) {
      webRTCState.setState({ remoteVideoChatStreamId: streamId });
      setters.setRemoteStream(remoteStream);
    } else if (remoteVideoChatStreamId !== streamId) {
      injectables?.setRemoteCanvasStream?.(remoteStream);
    }
  };
};

const _handleIceConnectionStateChange = (
  pc: RTCPeerConnection,
  setters: Setters,
) => {
  console.debug('iceConnectionState', pc.iceConnectionState);
  if (pc.iceConnectionState === 'failed') {
    pc.restartIce();
  }

  setters.setIsConnected(
    pc.iceConnectionState === 'connected' ||
      pc.iceConnectionState === 'completed',
  );
};

const _handleNegotiationNeeded = async (
  pc: RTCPeerConnection,
  { setState }: WebRTCStateHandlers,
  { socket, roomId, partnerSocketId }: Observables,
) => {
  Assert.isDefined(roomId, 'roomId is not defined');
  Assert.isDefined(partnerSocketId, 'partnerId is not defined');
  Assert.isDefined(socket, 'socket is not defined');

  try {
    setState({ makingOffer: true });
    await pc.setLocalDescription();
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
  pc.oniceconnectionstatechange = () =>
    _handleIceConnectionStateChange(pc, params.setters);
  pc.onicecandidate = (ev) => _handleIceCandidate(ev, params.observables);
  pc.ontrack = (ev) => _handleTrackEvent(ev, webRTCState, params);
  pc.ondatachannel = (ev) =>
    DataChannelService.onDataChannel(ev, params, webRTCState);
};

export const PeerConnectionHandlers = {
  setup,
};
