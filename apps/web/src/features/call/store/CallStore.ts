import { action, computed, observable } from 'mobx';
import { ChatData } from '@mono/common-dto';
import { CallStoreParams } from '../in-call/model/CallStoreParams';

export class CallStore {
  static readonly NEW_MATCH_TIMEOUT = 1500;
  static readonly CHAT_NOTIFICATION_TIMEOUT = 3000;
  static readonly MAX_NOTIFICATION_MESSAGES = 20;
  static readonly MAX_CHAT_MESSAGES = 500;

  readonly isPolite: boolean;
  readonly roomId: string;
  readonly partnerSocketId: string;
  readonly partnerUserId: string;

  @observable.ref accessor remoteStream: MediaStream | null = null;
  @observable accessor chatMessages: ChatData[] = [];
  @observable accessor remoteVideoEnabled = true;
  @observable accessor remoteAudioEnabled = true;
  @observable accessor connectionEstablished = false;
  @observable accessor gameActive = false;
  @observable accessor showMessageNotification = false;
  @observable accessor notificationMessages: ChatData[] = [];

  constructor(callProps: CallStoreParams) {
    this.roomId = callProps.roomId;
    this.partnerSocketId = callProps.partnerSocketId;
    this.partnerUserId = callProps.partnerUserId;
    this.isPolite = callProps.isPolite;
  }

  @computed
  get unreadMessagesCount() {
    return this.notificationMessages.filter(
      ({ senderSocketId }) => senderSocketId === this.partnerSocketId,
    ).length;
  }

  @action
  setIsConnected = (value: boolean) => {
    this.connectionEstablished = value;
  };

  @action
  setRemoteStream = (stream: MediaStream) => {
    if (!this.remoteStream) {
      this.remoteStream = stream;
    }
  };

  @action
  addChatMessage = (data: ChatData) => {
    this.chatMessages.push(data);

    // Limit chat messages to prevent unbounded memory growth
    if (this.chatMessages.length > CallStore.MAX_CHAT_MESSAGES) {
      this.chatMessages = this.chatMessages.slice(-CallStore.MAX_CHAT_MESSAGES);
    }

    this.notificationMessages.push(data);

    // Limit notification messages to prevent unbounded memory growth
    if (
      this.notificationMessages.length > CallStore.MAX_NOTIFICATION_MESSAGES
    ) {
      this.notificationMessages = this.notificationMessages.slice(
        -CallStore.MAX_NOTIFICATION_MESSAGES,
      );
    }

    this.showMessageNotification = true;
  };

  @action
  hideMessageNotification = () => {
    this.showMessageNotification = false;
  };

  @action
  clearNotificationMessages = () => {
    this.notificationMessages = [];
  };

  @action
  setPartnerVideoEnabled = (enabled: boolean) => {
    this.remoteVideoEnabled = enabled;
  };

  @action
  setPartnerAudioEnabled = (enabled: boolean) => {
    this.remoteAudioEnabled = enabled;
  };

  @action
  setGameActive = (value: boolean) => {
    this.gameActive = value;
  };
}
