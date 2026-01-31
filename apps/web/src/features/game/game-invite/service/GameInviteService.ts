import { Assert, InviteData } from '@mono/common-dto';
import { DataChannelMessage, WebRTCService } from '@mono/fe-webrtc';
import { toast } from 'sonner';

const _getWebRTCInstance = () => {
  const webRTCInstance = WebRTCService.get();
  Assert.isDefined(webRTCInstance, 'WebRTCService is not defined');
  return webRTCInstance;
};

const addListener = (callback: (inviteData: InviteData) => void) => {
  const webRTCInstance = _getWebRTCInstance();
  webRTCInstance.addInjectable('handleIncomingInviteMessage', callback);
};

const removeListener = (callback: (inviteData: InviteData) => void) => {
  const webRTCInstance = WebRTCService.get();
  webRTCInstance?.removeInjectable('handleIncomingInviteMessage', callback);
};

const sendInvite = () => {
  const { sendMessage } = _getWebRTCInstance();

  const payload: DataChannelMessage = {
    type: 'INVITE',
    data: {
      type: 'INVITE',
    },
  };

  const onError = () => toast.error('Failed to send game invite');

  sendMessage(payload, onError);
};

const answerInvite = (accept: boolean) => {
  const { sendMessage } = _getWebRTCInstance();

  const payload: DataChannelMessage = {
    type: 'INVITE',
    data: {
      type: 'INVITE_RESPONSE',
      response: accept ? 'ACCEPT' : 'DECLINE',
    },
  };

  const onError = () => toast.error('Failed to send invite response');

  sendMessage(payload, onError);
};

const playerReady = (playerId: string, initiator: boolean) => {
  const { sendMessage } = _getWebRTCInstance();
  const payload: DataChannelMessage = {
    type: 'INVITE',
    data: {
      type: 'PLAYER_READY',
      playerId,
      initiator,
    },
  };

  const onError = () => toast.error('Failed to send player ready status');

  sendMessage(payload, onError);
};

export const GameInviteService = {
  addListener,
  removeListener,
  sendInvite,
  answerInvite,
  playerReady,
};
