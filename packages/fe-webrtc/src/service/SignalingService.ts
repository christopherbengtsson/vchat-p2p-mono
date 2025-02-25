import { Assert } from '@mono/common-dto';
import { type Maybe, PeerMessage } from '@mono/common-dto';
import type { VChatSocket } from '@mono/fe-dto';
import type { WebRTCStateHandlers } from '../model/WebRTCStateHandlers.js';
import type { WebRTCParams } from '../model/WebRTCParams.js';

const _handleOffer = async (
  peerConnection: RTCPeerConnection,
  params: WebRTCParams,
  peerMessage: PeerMessage,
  webRTCState: WebRTCStateHandlers,
) => {
  Assert.isDefined(params.observables.socket);
  Assert.isDefined(params.observables.roomId);
  Assert.isDefined(params.observables.partnerSocketId);

  if (!peerConnection) {
    console.warn(
      'Attempting to handle offer before PeerConnection is initialized',
    );
    return;
  }

  const { makingOffer } = webRTCState.getState();
  let ignoreOffer = false;

  try {
    if (PeerMessage.isDescription(peerMessage) && !!peerMessage.description) {
      const { description } = peerMessage;
      const offerCollision =
        description.type === 'offer' &&
        (makingOffer || peerConnection.signalingState !== 'stable');

      ignoreOffer = !params.observables.isPolite && offerCollision;
      webRTCState.setState({ ignoreOffer });

      if (ignoreOffer) return;

      await peerConnection.setRemoteDescription(description); // SRD rolls back as needed

      if (description.type === 'offer') {
        await peerConnection.setLocalDescription();
        params.observables.socket.emit(
          'peer-message',
          { description: peerConnection.localDescription },
          params.observables.roomId,
          params.observables.partnerSocketId,
        );
      }
    } else if (
      PeerMessage.isCandidate(peerMessage) &&
      !!peerMessage.candidate
    ) {
      try {
        await peerConnection.addIceCandidate(peerMessage.candidate);
      } catch (err) {
        if (!ignoreOffer) throw err; // Suppress ignored offer's candidates
      }
    }
  } catch (error) {
    console.warn(error);
  }
};

const setup = (
  pc: RTCPeerConnection,
  params: WebRTCParams,
  webRTCState: WebRTCStateHandlers,
) => {
  Assert.isDefined(params.observables.socket, 'Socket is not defined');
  params.observables.socket.on('peer-message', (peerMessage) =>
    _handleOffer(pc, params, peerMessage, webRTCState),
  );
};

const close = (socket: Maybe<VChatSocket>) => {
  socket?.off('peer-message');
};

export const SignalingService = {
  setup,
  close,
};
