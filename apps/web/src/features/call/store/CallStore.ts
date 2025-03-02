import { makeAutoObservable, observable } from 'mobx';

interface CallStoreProps {
  roomId: string;
  partnerSocketId: string;
  partnerUserId: string;
  isPolite: boolean;
}

export class CallStore {
  static NEW_MATCH_TIMEOUT = 1500;

  isPolite: boolean;
  roomId: string;
  partnerSocketId: string;
  partnerUserId: string;

  remoteVideoEnabled = true;
  remoteAudioEnabled = true;

  remoteStream: MediaStream | null = null;

  connectionEstablished = false;

  gameActive = false;

  constructor(callProps: CallStoreProps) {
    this.roomId = callProps.roomId;
    this.partnerSocketId = callProps.partnerSocketId;
    this.partnerUserId = callProps.partnerUserId;
    this.isPolite = callProps.isPolite;

    makeAutoObservable(this, {
      remoteStream: observable.ref,

      isPolite: false,
      roomId: false,
      partnerSocketId: false,
      partnerUserId: false,
    });
  }

  setIsConnected = (value: boolean) => {
    this.connectionEstablished = value;
  };
  setRemoteStream = (stream: MediaStream) => {
    if (!this.remoteStream) {
      this.remoteStream = stream;
    }
  };
  setPartnerVideoEnabled = (enabled: boolean) => {
    this.remoteVideoEnabled = enabled;
  };
  setPartnerAudioEnabled = (enabled: boolean) => {
    this.remoteAudioEnabled = enabled;
  };

  setGameActive = (value: boolean) => {
    this.gameActive = value;
  };
}
