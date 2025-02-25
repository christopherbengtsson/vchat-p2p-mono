import { makeAutoObservable, observable } from 'mobx';
import type { RootStore } from '@/stores/RootStore';
import { GameStore } from '../../../stores/GameStore';

interface CallStoreProps {
  roomId: string;
  partnerSocketId: string;
  partnerUserId: string;
  isPolite: boolean;
}

export class CallStore {
  static NEW_MATCH_TIMEOUT = 1500;

  private rootStore: RootStore;

  isPolite: boolean;
  roomId: string;
  partnerSocketId: string;
  partnerUserId: string;
  remoteVideoEnabled = true;
  remoteAudioEnabled = true;

  remoteStream: MediaStream | null = null;

  isConnected = false;

  gameStore: GameStore;

  constructor(rootStore: RootStore, callProps: CallStoreProps) {
    this.rootStore = rootStore;
    this.roomId = callProps.roomId;
    this.partnerSocketId = callProps.partnerSocketId;
    this.partnerUserId = callProps.partnerUserId;
    this.isPolite = callProps.isPolite;

    this.gameStore = new GameStore(this.rootStore);

    makeAutoObservable(this, {
      remoteStream: observable.ref,

      isPolite: false,
    });
  }
  setIsConnected = (value: boolean) => {
    this.isConnected = value;
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

  setCallObservables({
    roomId,
    partnerSocketId,
    partnerUserId,
    isPolite,
  }: {
    roomId: string;
    partnerSocketId: string;
    partnerUserId: string;
    isPolite: boolean;
  }) {
    this.roomId = roomId;
    this.partnerSocketId = partnerSocketId;
    this.partnerUserId = partnerUserId;
    this.isPolite = isPolite;
  }

  // TODO: Remove
  dispose() {
    this.gameStore.cleanupGame();
  }
}
