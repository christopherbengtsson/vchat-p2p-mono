import { makeAutoObservable, observable } from 'mobx';
import type { Maybe } from '@mono/common-dto';
import type { RootStore } from '@/stores/RootStore';
import { WebRTCService } from '../service/WebRTCService';
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

  webRtcService: Maybe<WebRTCService>;
  remoteStream: MediaStream | null = null;

  isConnected = false;

  gameStore: GameStore;

  constructor(rootStore: RootStore, callProps: CallStoreProps) {
    this.rootStore = rootStore;
    this.roomId = callProps.roomId;
    this.partnerSocketId = callProps.partnerSocketId;
    this.partnerUserId = callProps.partnerUserId;
    this.isPolite = callProps.isPolite;

    this.gameStore = new GameStore(this.rootStore, this);

    makeAutoObservable(this, {
      webRtcService: observable.ref,
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

  initNewCall(
    roomId: string,
    partnerSocketId: string,
    partnerUserId: string,
    isPolite: boolean,
  ) {
    this.roomId = roomId;
    this.partnerSocketId = partnerSocketId;
    this.partnerUserId = partnerUserId;
    this.isPolite = isPolite;

    if (this.webRtcService) {
      this.webRtcService.cleanup();
    }

    this.webRtcService = new WebRTCService({
      observables: {
        socket: this.rootStore.socketStore.socket,
        localStream: this.rootStore.mediaStore.stream,
        roomId,
        partnerSocketId,
        isPolite,
      },
      callbacks: {
        handlePartnerVideoToggle: this.setPartnerVideoEnabled,
        handlePartnerAudioToggle: this.setPartnerAudioEnabled,
      },
      setters: {
        setRemoteStream: this.setRemoteStream,
        setIsConnected: this.setIsConnected,
      },
      injectables: {
        handleIncomingGameMessage: this.gameStore.handleIncomingMessage,
        setRemoteCanvasStream: this.gameStore.setRemoteCanvasStream,
      },
    });
  }

  // TODO: Remove
  cleanupAfterCall() {
    this.gameStore.cleanupGame();
    this.webRtcService?.cleanup();
    this.webRtcService = undefined;

    this.isPolite = false;

    this.remoteVideoEnabled = true;
    this.remoteAudioEnabled = true;

    this.remoteStream = null;
  }
  resetCallState() {
    this.rootStore.mediaStore.closeAudioAndVideoStream();
    this.cleanupAfterCall();
  }
}
