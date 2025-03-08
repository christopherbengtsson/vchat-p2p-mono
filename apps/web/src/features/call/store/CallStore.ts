import { action, observable } from 'mobx';
import { CallStoreParams } from '../in-call/model/CallStoreParams';

export class CallStore {
  static NEW_MATCH_TIMEOUT = 1500;

  isPolite: boolean;
  roomId: string;
  partnerSocketId: string;
  partnerUserId: string;

  @observable.ref accessor remoteStream: MediaStream | null = null;
  @observable accessor remoteVideoEnabled = true;
  @observable accessor remoteAudioEnabled = true;
  @observable accessor connectionEstablished = false;
  @observable accessor gameActive = false;

  constructor(callProps: CallStoreParams) {
    this.roomId = callProps.roomId;
    this.partnerSocketId = callProps.partnerSocketId;
    this.partnerUserId = callProps.partnerUserId;
    this.isPolite = callProps.isPolite;
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
