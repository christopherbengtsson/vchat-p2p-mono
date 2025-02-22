import { Maybe } from '@mono/common-dto';
import { DataChannelMessage } from '@/stores/model/DataChannelMessage';
import { ChatSocket } from '@/stores/model/SocketModel';
import { WebRTCState } from './WebRTCState';
import { WebRTCParams } from './types';
import { PeerConnectionHandlers } from './PeerConnectionHandlers';
import { DataChannel } from './DataChannel';
import { Signaling } from './Signaling';
import { AdHoc } from './AdHoc';
import { PeerConnection } from './PeerConnection';

const _close = (
  peerConnection: RTCPeerConnection,
  dataChannel: Maybe<RTCDataChannel>,
  socket: Maybe<ChatSocket>,
) => {
  Signaling.close(socket);
  DataChannel.close(dataChannel);
  PeerConnection.close(peerConnection);
};

const create = (params: WebRTCParams) => {
  const webRTCState = WebRTCState.create();
  const peerConnection = PeerConnection.create();

  PeerConnectionHandlers.setup(peerConnection, params, webRTCState);
  const dataChannel = DataChannel.create(peerConnection, params);
  Signaling.setup(peerConnection, params, webRTCState);

  return {
    sendMessage: (msg: DataChannelMessage) =>
      DataChannel.sendMessage(dataChannel, msg),
    addCanvasStream: (stream: MediaStream) =>
      AdHoc.addCanvasStream(peerConnection, webRTCState, stream),
    removeCanvasStream: () =>
      AdHoc.removeCanvasStream(peerConnection, webRTCState),
    close: () => _close(peerConnection, dataChannel, params.observables.socket),
  };
};

export const WebRtc = {
  create,
};
