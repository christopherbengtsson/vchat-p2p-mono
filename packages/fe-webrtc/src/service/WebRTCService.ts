import type { Maybe } from '@mono/common-dto';
import type { VChatSocket } from '@mono/fe-dto';
import type { DataChannelMessage } from '../model/DataChannelMessage.js';
import type { WebRTCParams } from '../model/WebRTCParams.js';
import type {
  InjectableHandler,
  Injectables,
  RemovableHandler,
} from '../model/Injectables.js';
import { PeerConnectionHandlers } from './PeerConnectionHandlers.js';
import { DataChannelService } from './DataChannelService.js';
import { SignalingService } from './SignalingService.js';
import { AdHocService } from './AdHocService.js';
import { PeerConnectionService } from './PeerConnectionService.js';
import { WebRTCStateService } from './WebRTCStateService.js';

interface WebRTCInstance {
  isConnecting: () => boolean;
  isConnected: () => boolean;

  sendMessage: (msg: DataChannelMessage) => void;

  addCanvasStream: (stream: MediaStream) => void;
  removeCanvasStream: () => void;

  addInjectable: <K extends keyof Injectables>(
    key: K,
    handler: InjectableHandler<K>,
  ) => void;
  removeInjectable: <K extends keyof Injectables>(
    key: K,
    handler?: RemovableHandler<K>,
  ) => void;

  close: () => void;
}

let instance: Maybe<WebRTCInstance>;

const _close = (
  peerConnection: RTCPeerConnection,
  dataChannel: Maybe<RTCDataChannel>,
  socket: Maybe<VChatSocket>,
) => {
  SignalingService.close(socket);
  DataChannelService.close(dataChannel);
  PeerConnectionService.close(peerConnection);
  instance = undefined;
};

const get = () => instance;

const create = (params: WebRTCParams, override = true) => {
  if (instance) {
    if (override) {
      instance.close();
    } else {
      return instance;
    }
  }

  const webRTCState = WebRTCStateService.create();
  const peerConnection = PeerConnectionService.create();

  PeerConnectionHandlers.setup(peerConnection, params, webRTCState);
  DataChannelService.create(peerConnection, params, webRTCState);
  SignalingService.setup(peerConnection, params, webRTCState);

  AdHocService.addLocalStream(peerConnection, params.observables.localStream);

  instance = {
    isConnecting: () => peerConnection.connectionState === 'connecting',
    isConnected: () => peerConnection.connectionState === 'connected',

    sendMessage: (msg) =>
      DataChannelService.sendMessage(DataChannelService.get(), msg),
    addCanvasStream: (stream) =>
      AdHocService.addCanvasStream(peerConnection, webRTCState, stream),
    removeCanvasStream: () =>
      AdHocService.removeCanvasStream(peerConnection, webRTCState),
    addInjectable: (listener, callback) =>
      AdHocService.addInjectable(webRTCState, listener, callback),
    removeInjectable: (listener, callback) =>
      AdHocService.removeInjectable(webRTCState, listener, callback),

    close: () =>
      _close(
        peerConnection,
        DataChannelService.get(),
        params.observables.socket,
      ),
  };

  return instance;
};

export const WebRTCService = {
  create,
  get,
};
