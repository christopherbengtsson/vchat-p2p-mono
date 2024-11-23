import { makeAutoObservable, observable, runInAction } from 'mobx';
import { toast } from 'sonner';
import { Assert } from '@/common/utils/Assert';
import { WebRTCService } from '../features/call/service/WebRTCService';
import type { RootStore } from './RootStore';
import { CallState } from './model/CallState';

export class CallStore {
  static NEW_MATCH_TIMEOUT = 1500;

  private rootStore: RootStore;

  callState: CallState = CallState.START;
  isPolite = false;
  roomId: string | undefined = undefined;
  partnerId: string | undefined = undefined;
  remoteVideoEnabled = true;
  remoteAudioEnabled = true;

  webRtcService: WebRTCService | undefined = undefined;
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
      this.rootStore.socketStore.id,
    );
  }

  initNewCall(roomId: string, partnerId: string, isPolite: boolean) {
    this.setupListeners();

    this.roomId = roomId;
    this.partnerId = partnerId;
    this.isPolite = isPolite;
    this.webRtcService = new WebRTCService(this.rootStore);

    this.emitJoinRoom(roomId);
    this.callState = CallState.MATCH_FOUND;

    setTimeout(() => {
      runInAction(() => {
        this.callState = CallState.IN_CALL;
      });
    }, CallStore.NEW_MATCH_TIMEOUT);
  }

  emitVideoToggle(toggle: boolean) {
    Assert.isDefined(this.roomId, 'roomId is not defined');
    this.rootStore.socketStore.socket?.emit(
      'video-toggle',
      toggle,
      this.roomId,
    );
  }

  emitAudioToggle(toggle: boolean) {
    Assert.isDefined(this.roomId, 'roomId is not defined');
    this.rootStore.socketStore.socket?.emit(
      'audio-toggle',
      toggle,
      this.roomId,
    );
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
    this.remoteStream = null;
    this.roomId = undefined;
    this.partnerId = undefined;
  }

  resetCallState() {
    this.callState = CallState.START;
    this.rootStore.mediaStore.closeAudioAndVideoStream();
    this.cleanupAfterCall();
  }

  setRemoteStream(stream: MediaStream) {
    this.remoteStream = stream;
  }

  emitFindMatch() {
    this.rootStore.socketStore.socket?.emit(
      'find-match',
      this.rootStore.socketStore.id,
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
    socket.on('video-toggle', this.handleVideoToggle);
    socket.on('audio-toggle', this.handleAudioToggle);
  }

  removeListeners() {
    const socket = this.rootStore.socketStore.socket;
    if (!socket) return;

    socket.off('user-left', this.handleUserLeft);
    socket.off('partner-disconnected', this.handlePartnerDisconnected);
    socket.off('video-toggle', this.handleVideoToggle);
    socket.off('audio-toggle', this.handleAudioToggle);
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

  handleVideoToggle = (enabled: boolean) => {
    this.remoteVideoEnabled = enabled;
  };

  handleAudioToggle = (enabled: boolean) => {
    this.remoteAudioEnabled = enabled;
  };
}
