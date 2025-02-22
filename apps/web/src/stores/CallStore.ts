import { makeAutoObservable, observable, runInAction } from 'mobx';
import { toast } from 'sonner';
import type { Maybe } from '@mono/common-dto';
import { Assert } from '@/common/utils/Assert';
import { WebRTCService } from '../features/call/service/WebRTCService';
import type { RootStore } from './RootStore';
import { CallState } from './model/CallState';

export class CallStore {
  static NEW_MATCH_TIMEOUT = 1500;

  private rootStore: RootStore;

  callState: CallState = CallState.START;
  isPolite = false;
  roomId: Maybe<string>;
  partnerSocketId: Maybe<string>;
  partnerUserId: Maybe<string>;
  remoteVideoEnabled = true;
  remoteAudioEnabled = true;

  webRtcService: Maybe<WebRTCService>;
  remoteStream: MediaStream | null = null;

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;

    makeAutoObservable(this, {
      webRtcService: observable.ref,
      remoteStream: observable.ref,

      isPolite: false,
    });
  }

  get isInCall() {
    return this.callState === CallState.IN_CALL;
  }

  findMatch(slow?: boolean) {
    this.callState = CallState.IN_QUEUE;

    if (slow) {
      setTimeout(() => {
        this.emitFindMatch();
      }, 2000);
    } else {
      this.emitFindMatch();
    }
  }

  cancelMatch() {
    this.resetCallState();
    this.rootStore.socketStore.socket?.emit(
      'cancel-match',
      this.rootStore.authStore.userId,
    );
  }

  initNewCall(
    roomId: string,
    partnerSocketId: string,
    partnerUserId: string,
    isPolite: boolean,
  ) {
    this.setupListeners();

    this.roomId = roomId;
    this.partnerSocketId = partnerSocketId;
    this.partnerUserId = partnerUserId;
    this.isPolite = isPolite;

    this.webRtcService = new WebRTCService({
      observables: {
        socket: this.rootStore.socketStore.socket,
        localStream: this.rootStore.mediaStore.stream,
        roomId,
        partnerSocketId,
        isPolite,
      },
      callbacks: {
        handlePartnerVideoToggle: this.handlePartnerVideoToggle,
        handlePartnerAudioToggle: this.handlePartnerAudioToggle,
      },
      setters: {
        setRemoteStream: this.setRemoteStream,
      },
      injectables: {
        handleIncomingGameMessage:
          this.rootStore.gameStore.handleIncomingMessage,
        setRemoteCanvasStream: this.rootStore.gameStore.setRemoteCanvasStream,
      },
    });

    this.emitJoinRoom(roomId);
    this.callState = CallState.MATCH_FOUND;

    setTimeout(() => {
      runInAction(() => {
        this.callState = CallState.IN_CALL;
      });
    }, CallStore.NEW_MATCH_TIMEOUT);
  }

  endCall() {
    if (this.roomId) {
      this.emitLeaveRoom();
    }
    this.cleanupAfterCall();
    this.findMatch();
  }

  cleanupAfterCall() {
    this.removeListeners();
    this.rootStore.gameStore.cleanupGame();
    this.webRtcService?.cleanup();
    this.webRtcService = undefined;

    this.isPolite = false;
    this.roomId = undefined;
    this.partnerSocketId = undefined;
    this.partnerUserId = undefined;
    this.partnerSocketId = undefined;

    this.remoteVideoEnabled = true;
    this.remoteAudioEnabled = true;

    this.remoteStream = null;
  }

  resetCallState() {
    this.callState = CallState.START;
    this.rootStore.mediaStore.closeAudioAndVideoStream();
    this.cleanupAfterCall();
  }

  setRemoteStream = (stream: MediaStream) => {
    if (!this.remoteStream) {
      this.remoteStream = stream;
    }
  };

  emitFindMatch() {
    this.rootStore.socketStore.socket?.emit(
      'find-match',
      this.rootStore.socketStore.id,
      this.rootStore.authStore.userId,
    );
  }

  emitJoinRoom(roomId: string) {
    this.rootStore.socketStore.socket?.emit(
      'join-room',
      roomId,
      this.rootStore.socketStore.id,
    );
  }

  emitLeaveRoom() {
    Assert.isDefined(this.roomId, 'roomId is not defined');
    this.rootStore.socketStore.socket?.emit(
      'leave-room',
      this.roomId,
      this.rootStore.socketStore.id,
    );
  }

  setupListeners() {
    const socket = this.rootStore.socketStore.socket;
    if (!socket) return;

    socket.on('user-left', this.handleUserLeft);
    socket.on('partner-disconnected', this.handlePartnerDisconnected);
  }

  removeListeners() {
    const socket = this.rootStore.socketStore.socket;
    if (!socket) return;

    socket.off('user-left', this.handleUserLeft);
    socket.off('partner-disconnected', this.handlePartnerDisconnected);
  }

  handleUserLeft = () => {
    this.cleanupAfterCall();
    this.findMatch(true);
    toast('Partner left the call');
  };

  handlePartnerDisconnected = () => {
    this.cleanupAfterCall();
    this.findMatch();
    toast('Partner disconnected');
  };

  handlePartnerVideoToggle = (enabled: boolean) => {
    this.remoteVideoEnabled = enabled;
  };

  handlePartnerAudioToggle = (enabled: boolean) => {
    this.remoteAudioEnabled = enabled;
  };
}
