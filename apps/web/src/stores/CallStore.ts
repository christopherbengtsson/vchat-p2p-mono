import { makeAutoObservable } from 'mobx';
import { WebRTCService } from '../features/call/service/WebRTCService';
import type { RootStore } from './RootStore';
import { CallState } from './model/CallState';

export class CallStore {
  static NEW_MATCH_TIMEOUT = 1500;

  private rootStore: RootStore;
  private _webRtcService: WebRTCService | undefined;

  private _callState: CallState = CallState.START;

  private _isPolite = false;
  private _roomId: string | undefined;
  private _partnerId: string | undefined;

  private _remoteStream: MediaStream | null = null;
  private _remoteVideoEnabled = true;
  private _remoteAudioEnabled = true;

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;

    makeAutoObservable(this);
  }

  get callState() {
    return this._callState;
  }
  set callState(state: CallState) {
    this._callState = state;
  }

  get isPolite() {
    return this._isPolite;
  }
  set isPolite(value: boolean) {
    this._isPolite = value;
  }

  get roomId(): string {
    if (!this._roomId) {
      throw new Error('Room id not defined');
    }
    return this._roomId;
  }
  set roomId(value: string | undefined) {
    this._roomId = value;
  }

  get partnerId(): string {
    if (!this._partnerId) {
      throw new Error('Partner id not defined');
    }
    return this._partnerId;
  }
  set partnerId(value: string | undefined) {
    this._partnerId = value;
  }

  get webRtcService() {
    return this._webRtcService;
  }
  set webRtcService(value: WebRTCService | undefined) {
    this._webRtcService = value;
  }

  get remoteVideoEnabled() {
    return this._remoteVideoEnabled;
  }
  set remoteVideoEnabled(value: boolean) {
    this._remoteVideoEnabled = value;
  }

  get remoteStream() {
    return this._remoteStream;
  }
  set remoteStream(value: MediaStream | null) {
    this._remoteStream = value;
  }

  get remoteAudioEnabled() {
    return this._remoteAudioEnabled;
  }
  set remoteAudioEnabled(value: boolean) {
    this._remoteAudioEnabled = value;
  }

  findMatch(slow?: boolean) {
    this.callState = CallState.IN_QUEUE;

    if (slow) {
      setTimeout(() => {
        this.rootStore.socketStore.socket.emit(
          'find-match',
          this.rootStore.socketStore.id,
        );
      }, 2000);
    } else {
      this.rootStore.socketStore.socket.emit(
        'find-match',
        this.rootStore.socketStore.id,
      );
    }
  }

  cancelMatch() {
    this.resetCallState();
    this.rootStore.socketStore.socket.emit(
      'cancel-match',
      this.rootStore.socketStore.id,
    );
  }

  initNewCall(roomId: string, partnerId: string, isPolite: boolean) {
    this._setupListeners();

    this.roomId = roomId;
    this.partnerId = partnerId;
    this.isPolite = isPolite;

    this._webRtcService = new WebRTCService(this.rootStore);

    this.rootStore.socketStore.socket.emit(
      'join-room',
      roomId,
      this.rootStore.socketStore.id,
    );

    this.callState = CallState.MATCH_FOUND;

    setTimeout(() => {
      this.callState = CallState.IN_CALL;
    }, CallStore.NEW_MATCH_TIMEOUT);
  }

  emitVideoToggle(toggle: boolean) {
    this.rootStore.socketStore.socket.emit('video-toggle', toggle, this.roomId);
  }

  emitAudioToggle(toggle: boolean) {
    this.rootStore.socketStore.socket.emit('audio-toggle', toggle, this.roomId);
  }

  endCall() {
    this.rootStore.socketStore.socket.emit(
      'leave-room',
      this.roomId,
      this.rootStore.socketStore.id,
    );

    this.cleanupAfterCall();
    this.findMatch();
  }

  cleanupAfterCall() {
    this._removeListeners();

    this._webRtcService?.cleanup();
    this._webRtcService = undefined;
    this.remoteStream = null;

    this.roomId = undefined;
    this.partnerId = undefined;
  }

  resetCallState() {
    this.callState = CallState.START;
    this.rootStore.mediaStore.closeAudioAndVideoStream();
    this.cleanupAfterCall();
  }

  private _setupListeners() {
    const socket = this.rootStore.socketStore.maybeSocket;
    if (!socket) {
      return;
    }

    socket.on('user-left', () => {
      this.cleanupAfterCall();
      this.findMatch(true);
    });

    socket.on('partner-disconnected', () => {
      this.cleanupAfterCall();
      this.findMatch();
    });

    socket.on('video-toggle', (enabled) => {
      this.remoteVideoEnabled = enabled;
    });

    socket.on('audio-toggle', (enabled) => {
      this.remoteAudioEnabled = enabled;
    });
  }

  private _removeListeners() {
    const socket = this.rootStore.socketStore.maybeSocket;
    if (!socket) {
      return;
    }
    socket.off('user-left');
    socket.off('partner-disconnected');
    socket.off('video-toggle');
    socket.off('audio-toggle');
  }
}
