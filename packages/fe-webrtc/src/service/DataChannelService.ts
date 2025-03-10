import type { Maybe } from '@mono/common-dto';
import type { DataChannelMessage } from '../model/DataChannelMessage.js';
import type { WebRTCParams } from '../model/WebRTCParams.js';
import { WebRTCStateHandlers } from '../model/WebRTCStateHandlers.js';

let _dataChannel: Maybe<RTCDataChannel>;

const sendMessage = (
  dataChannel: Maybe<RTCDataChannel>,
  message: DataChannelMessage,
) => {
  if (dataChannel && dataChannel.readyState === 'open') {
    dataChannel.send(JSON.stringify(message));
  } else {
    console.warn('Data channel is not open. Cannot send message:', message);
  }
};

const _handleDataChannelMessage = (
  event: MessageEvent,
  { callbacks }: WebRTCParams,
  state: WebRTCStateHandlers,
) => {
  const message: DataChannelMessage = JSON.parse(event.data);
  const { injectables } = state.getState();

  switch (message.type) {
    case 'INVITE':
      injectables?.handleIncomingInviteMessage?.forEach((callback) => {
        callback(message.data);
      });
      break;

    case 'GAME':
      injectables?.handleGameRoundMessage?.forEach((callback) => {
        callback(message.data);
      });
      break;

    case 'VIDEO_TOGGLE':
      callbacks.handlePartnerVideoToggle(message.toggle);
      break;

    case 'AUDIO_TOGGLE':
      callbacks.handlePartnerAudioToggle(message.toggle);
      break;

    // TODO: Add cases for other message types (e.g., chat messages)
    default:
      console.warn('Unknown message:', message);
  }
};

const onDataChannel = (
  event: RTCDataChannelEvent,
  params: WebRTCParams,
  state: WebRTCStateHandlers,
) => {
  const dataChannel = event.channel;
  _setup(dataChannel, params, state);
};

const _setup = (
  dataChannel: RTCDataChannel,
  params: WebRTCParams,
  state: WebRTCStateHandlers,
) => {
  _dataChannel = dataChannel;

  dataChannel.onopen = () => {
    // Send the initial state for stream enabled status
    sendMessage(dataChannel, {
      type: 'VIDEO_TOGGLE',
      toggle:
        params.observables.localStream?.getVideoTracks()[0].enabled ?? false,
    });
  };

  dataChannel.onmessage = (event) =>
    _handleDataChannelMessage(event, params, state);
};

const get = () => _dataChannel;

const close = (dataChannel: Maybe<RTCDataChannel>) => {
  dataChannel?.close();
  _dataChannel = undefined;
};

const create = (
  pc: RTCPeerConnection,
  params: WebRTCParams,
  state: WebRTCStateHandlers,
) => {
  if (!params.observables.isPolite) {
    const dataChannel = pc.createDataChannel('game');
    _setup(dataChannel, params, state);

    return dataChannel;
  }
};

export const DataChannelService = {
  create,
  close,
  get,
  sendMessage,
  onDataChannel,
};
