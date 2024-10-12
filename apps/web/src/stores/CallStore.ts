import { makeAutoObservable } from 'mobx';
import { WebRTCService } from '../services/WebRTCService';
import type { RootStore } from './RootStore';
import { AppState } from './model/AppState';

export class CallStore {
  private rootStore: RootStore;
  private webRtcService: WebRTCService | undefined;

  private _inCall = false;
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

  get inCall() {
    return this._inCall;
  }
  set inCall(value: boolean) {
    this._inCall = value;
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

  get remoteVideoEnabled() {
    return this._remoteVideoEnabled;
  }
  set remoteVideoEnabled(value: boolean) {
    this._remoteVideoEnabled = value;
  }

  get remoteStream() {
    return this._remoteStream ?? null;
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

  initNewCall(roomId: string, partnerId: string, isPolite: boolean) {
    this.roomId = roomId;
    this.partnerId = partnerId;
    this.isPolite = isPolite;

    this.webRtcService = new WebRTCService(this.rootStore);

    this.rootStore.socketStore.socket.emit(
      'join-room',
      roomId,
      this.rootStore.socketStore.id,
    );

    this.rootStore.uiStore.appState = AppState.MATCH_FOUND;

    setTimeout(() => {
      this.rootStore.uiStore.appState = AppState.IN_CALL;
      this.inCall = true;
    }, 1500);
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

    this.rootStore.uiStore.findMatch();

    this.cleanupAfterCall();
  }

  cleanupAfterCall() {
    this.webRtcService?.cleanup();
    this.webRtcService = undefined;
    this.remoteStream = null;

    this.roomId = undefined;
    this.partnerId = undefined;
    this.inCall = false;
  }
}
