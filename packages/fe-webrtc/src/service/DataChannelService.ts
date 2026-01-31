import type { Maybe } from '@mono/common-dto';
import { TokenBucket } from '@mono/common-util';
import type { DataChannelMessage } from '../model/DataChannelMessage.js';
import type { WebRTCParams } from '../model/WebRTCParams.js';
import { WebRTCStateHandlers } from '../model/WebRTCStateHandlers.js';

let _dataChannel: Maybe<RTCDataChannel>;
let _chatRateLimiter: Maybe<TokenBucket>;

const sendMessage = (
  dataChannel: Maybe<RTCDataChannel>,
  message: DataChannelMessage,
  onError?: VoidFunction,
  onRateLimited?: VoidFunction,
) => {
  if (!dataChannel || dataChannel.readyState !== 'open') {
    console.warn('Data channel not open:', message.type);
    return false;
  }

  // Apply rate limiting to CHAT messages
  if (message.type === 'CHAT' && _chatRateLimiter) {
    if (!_chatRateLimiter.tryConsume(1)) {
      console.warn('Chat message rate limit exceeded');
      onRateLimited?.();
      return false;
    }
  }

  // Send the message
  try {
    dataChannel.send(JSON.stringify(message));
    return true;
  } catch (error) {
    console.error(`Failed to send ${message.type}:`, error);
    onError?.();
    return false;
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
    case 'CHAT':
      callbacks.handleIncomingChatMessage(message.data);
      break;

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

  // Initialize rate limiter: 10 messages per second
  _chatRateLimiter = new TokenBucket(10, 10);

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
  _chatRateLimiter = undefined;
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
