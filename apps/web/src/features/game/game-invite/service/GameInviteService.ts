import { Assert, InviteData } from '@mono/common-dto';
import { DataChannelMessage, WebRTCService } from '@mono/fe-webrtc';

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
  const webRTCInstance = _getWebRTCInstance();
  webRTCInstance.removeInjectable('handleIncomingInviteMessage', callback);
};

const sendInvite = () => {
  const { sendMessage } = _getWebRTCInstance();

  const payload: DataChannelMessage = {
    type: 'INVITE',
    data: {
      type: 'INVITE',
    },
  };
  sendMessage(payload);
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

  sendMessage(payload);
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
  sendMessage(payload);
};

export const GameInviteService = {
  addListener,
  removeListener,
  sendInvite,
  answerInvite,
  playerReady,
};
