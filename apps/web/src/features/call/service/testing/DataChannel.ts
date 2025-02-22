import { Maybe } from '@mono/common-dto';
import { DataChannelMessage } from '@/stores/model/DataChannelMessage';
import { WebRTCParams } from './types';

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
  { injectables, callbacks }: WebRTCParams,
) => {
  const message: DataChannelMessage = JSON.parse(event.data);

  switch (message.type) {
    case 'GAME':
      injectables?.handleIncomingGameMessage?.(message.data);
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

const _setup = (dataChannel: RTCDataChannel, params: WebRTCParams) => {
  dataChannel.onopen = () => {
    console.debug('Data channel is open and ready to be used.');
    // Send the initial state for stream enabled status
    sendMessage(dataChannel, {
      type: 'VIDEO_TOGGLE',
      toggle:
        params.observables.localStream?.getVideoTracks()[0].enabled ?? false,
    });
  };

  dataChannel.onmessage = (event) => _handleDataChannelMessage(event, params);
};

const close = (dataChannel: Maybe<RTCDataChannel>) => {
  dataChannel?.close();
};

const create = (pc: RTCPeerConnection, params: WebRTCParams) => {
  if (!params.observables.isPolite) {
    const dataChannel = pc.createDataChannel('game');
    _setup(dataChannel, params);

    return dataChannel;
  }
};

export const DataChannel = {
  create,
  close,
  sendMessage,
};
