import { makeAutoObservable, observable, runInAction } from 'mobx';
import { type Socket, io } from 'socket.io-client';
import { WebRtcStore } from './WebRtcStore';
import type { ClientToServerEvents, ServerToClientEvents } from 'common-dto';
import { AppState } from './model/AppState';
import { AuthStore } from './AuthStore';

export class MainStore {
  authStore: AuthStore;
  webRtcStore: WebRtcStore;

  maybeSocket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

  appState: AppState = AppState.START;

  nrOfAvailableUsers = 0;

  constructor() {
    this.authStore = new AuthStore();
    this.webRtcStore = new WebRtcStore();

    makeAutoObservable(this, {
      // TODO: Check overrides
      maybeSocket: observable.ref,
      webRtcStore: false,
    });
  }

  get socket() {
    if (!this.maybeSocket) {
      this.updateState(AppState.ERROR);
      throw new Error('Socket is not defined');
    }
    return this.maybeSocket;
  }
  get id() {
    const id = this.socket.id;
    if (!id) {
      this.updateState(AppState.ERROR);
      throw new Error('Socket id is not defined');
    }
    return id;
  }

  connect() {
    const socket = io('http://192.168.1.2:8000/video-chat', {
      // transports: ["websocket"],
      // autoConnect: false,
      extraHeaders: {
        authorization: `Bearer ${this.authStore.session?.access_token}`,
      },
    });

    this.maybeSocket = socket;
    this.webRtcStore.init(socket);

    this.setupListeners();
  }
  disconnect() {
    this.maybeSocket?.disconnect();
    this.updateState(AppState.START);
  }
  findMatch() {
    this.updateState(AppState.IN_QUEUE);
    this.socket.emit('find-match', this.id);
  }
  cancelMatch() {
    this.updateState(AppState.START);
    this.socket.emit('cancel-match', this.id);
  }
  joinRoom(roomId: string) {
    this.socket.emit('join-room', roomId, this.id);
  }
  leaveRoom() {
    this.webRtcStore.cleanup();
    this.socket.emit('leave-room', this.webRtcStore.roomId, this.id);
    this.findMatch();
  }
  toggleVideo() {
    const toggle = !this.webRtcStore.localVideoEnabled;

    this.socket.emit('video-toggle', toggle, this.webRtcStore.roomId);
    this.webRtcStore.localVideoEnabled = toggle;
    if (this.webRtcStore.localStream) {
      this.webRtcStore.localStream.getVideoTracks()[0].enabled = toggle;
    }
  }
  toggleAudio() {
    const toggle = !this.webRtcStore.localAudioEnabled;

    this.socket.emit('audio-toggle', toggle, this.webRtcStore.roomId);
    this.webRtcStore.localAudioEnabled = toggle;
    if (this.webRtcStore.localStream) {
      this.webRtcStore.localStream.getAudioTracks()[0].enabled = toggle;
    }
  }

  private updateState(state: AppState) {
    runInAction(() => {
      this.appState = state;
    });
  }
  private setupListeners() {
    this.socket.on('connect', () => this.onConnect());
    this.socket.on('disconnect', (reason) => this.onDisconnect(reason));

    this.socket.on('connections-count', (count: number) => {
      runInAction(() => {
        this.nrOfAvailableUsers = count === 1 ? 0 : count - 1;
      });
    });

    this.socket.on('match-found', (...data) => this.onMatchFound(...data));
    this.socket.on('user-disconnected', () => this.onUserLeft());
    this.socket.on('partner-disconnected', () => this.onUserLeft());
  }
  private onConnect() {
    console.log('connected');
  }
  private onDisconnect(reason: Socket.DisconnectReason) {
    console.log('disconnected');

    if (reason === 'io server disconnect') {
      // TODO: Handle reconnect?
      // the disconnection was initiated by the server, you need to manually reconnect
      // this.maybeSocket?.active = false
      console.log('Disconnected by server');
    }

    this.updateState(AppState.START);
  }
  private async onMatchFound(
    roomId: string,
    partnerId: string,
    createOffer: boolean,
  ) {
    this.updateState(AppState.MATCH_FOUND);

    this.webRtcStore.setRoomAndUserId(roomId, partnerId);
    this.webRtcStore.initializePeerConnection();

    await this.webRtcStore.startLocalStream();

    if (createOffer) {
      this.webRtcStore.createOffer();
    } else {
      this.joinRoom(roomId);
    }

    setTimeout(() => {
      this.updateState(AppState.IN_CALL);
    }, 1500);
  }
  private async onUserLeft() {
    console.log('onUserLeft');
    this.webRtcStore.cleanup();
    this.findMatch();
  }
}
