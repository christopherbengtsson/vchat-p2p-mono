import { makeAutoObservable, observable, runInAction } from 'mobx';
import { type Socket, io } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@mono/common-dto';
import { AuthStore } from './AuthStore';
import { AppState } from './model/AppState';
import { ErrorState } from './model/ErrorState';
import { WebRtcStore } from './WebRtcStore';

export class MainStore {
  authStore: AuthStore;
  webRtcStore: WebRtcStore;

  maybeSocket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  isSocketConnected = false;

  appState: AppState = AppState.START;
  errorState: ErrorState | undefined = undefined;

  nrOfAvailableUsers = 0;

  constructor() {
    this.authStore = new AuthStore();
    this.webRtcStore = new WebRtcStore();

    makeAutoObservable(this, {
      // TODO: Check overrides
      /**
       * Like observable, but only reassignments will be tracked.
       * The assigned values are completely ignored and will NOT be
       * automatically converted to observable/autoAction/flow.
       * For example, use this if you intend to store immutable data in an observable field.
       */
      maybeSocket: observable.ref,

      webRtcStore: false,
    });
  }

  get socket() {
    if (!this.maybeSocket) {
      this.setAppState(AppState.ERROR);
      throw new Error('Socket is not defined');
    }
    return this.maybeSocket;
  }
  get id() {
    const id = this.socket.id;
    if (!id) {
      this.setAppState(AppState.ERROR);
      throw new Error('Socket id is not defined');
    }
    return id;
  }

  connect() {
    const socket = io('http://localhost:8000/video-chat', {
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
    this.setAppState(AppState.START);
  }
  findMatch() {
    this.setAppState(AppState.IN_QUEUE);
    this.socket.emit('find-match', this.id);
  }
  cancelMatch() {
    this.setAppState(AppState.START);
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

  private setAppState(state: AppState) {
    runInAction(() => {
      this.appState = state;
    });
  }
  private setErrorState(state: ErrorState | undefined) {
    runInAction(() => {
      this.errorState = state;
    });
  }

  private setupListeners() {
    this.socket.on('connect', () => {
      runInAction(() => {
        this.isSocketConnected = true;
      });
      console.log('connected');
    });

    this.socket.on('disconnect', (reason) => this.onDisconnect(reason));
    this.socket.on('connect_error', (_err) => {
      this.setErrorState(ErrorState.CONNECT_ERROR);
      this.socket.once('connect', () => {
        runInAction(() => {
          this.isSocketConnected = true;
        });
        this.setErrorState(undefined);
      });
    });

    this.socket.on('connections-count', (count: number) => {
      runInAction(() => {
        this.nrOfAvailableUsers = count === 1 ? 0 : count - 1;
      });
    });

    this.socket.on('match-found', (...data) => this.onMatchFound(...data));
    this.socket.on('user-disconnected', () => this.onUserLeft());
    this.socket.on('partner-disconnected', () => this.onUserLeft());
  }
  private onDisconnect(reason: Socket.DisconnectReason) {
    runInAction(() => {
      this.isSocketConnected = false;
    });
    console.log('disconnected');

    if (reason === 'io server disconnect') {
      // TODO: Handle reconnect?
      // the disconnection was initiated by the server, you need to manually reconnect
      // this.maybeSocket?.active = false
      console.log('Disconnected by server');
      this.setErrorState(ErrorState.SERVER_DISCONNECTED);
    }

    this.setAppState(AppState.START);
  }
  private async onMatchFound(
    roomId: string,
    partnerId: string,
    polite: boolean,
  ) {
    this.setAppState(AppState.MATCH_FOUND);
    console.log('Match found', 'partnerId', partnerId, 'polite', polite);

    this.joinRoom(roomId);
    await this.webRtcStore.start(roomId, partnerId, polite);

    setTimeout(() => {
      this.setAppState(AppState.IN_CALL);
    }, 1500);
  }
  private async onUserLeft() {
    console.log('onUserLeft');
    this.webRtcStore.cleanup();
    this.findMatch();
  }
}
