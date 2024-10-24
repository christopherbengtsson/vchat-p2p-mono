import { makeAutoObservable } from 'mobx';
import { io } from 'socket.io-client';
import { ChatSocket } from './model/SocketModel';
import type { RootStore } from './RootStore';
import { AppState } from './model/AppState';
import { ErrorState } from './model/ErrorState';

export class SocketStore {
  private rootStore: RootStore;

  private _socket: ChatSocket | null = null;
  private _connected = false;

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;

    makeAutoObservable(this);
  }
  get connected() {
    return this._connected;
  }
  set connected(value: boolean) {
    this._connected = value;
  }

  get socket() {
    if (!this._socket) {
      this.rootStore.uiStore.appState = AppState.ERROR;
      throw new Error('Socket not defined');
    }
    return this._socket;
  }
  get id() {
    const id = this.socket.id;
    if (!id) {
      this.rootStore.uiStore.appState = AppState.ERROR;
      throw new Error('Socket id not defined');
    }
    return id;
  }

  connect() {
    console.log('Connecting to socket. Prod:', import.meta.env.PROD);
    this._socket = io(`${import.meta.env.VITE_SERVER_URL}/video-chat`, {
      secure: import.meta.env.PROD,
      withCredentials: true,
      rememberUpgrade: true,
      extraHeaders: {
        authorization: `Bearer ${this.rootStore.authStore.session?.access_token}`,
      },
    });

    this._socket.on('connect_error', (err) => {
      console.log('connect_error', err);
    });

    this._socket.on('connect', () => {
      this.connected = true;
    });

    this._socket.on('disconnect', (reason) => {
      this.connected = false;

      console.log('disconnected');
      if (reason === 'io server disconnect') {
        // TODO: Handle reconnect?
        // the disconnection was initiated by the server, you need to manually reconnect
        // this.maybeSocket?.active = false
        console.log('Disconnected by server');
        this.rootStore.uiStore.errorState = ErrorState.SERVER_DISCONNECTED;
        this.rootStore.callStore.cleanupAfterCall();
      }

      this.rootStore.uiStore.appState = AppState.START;
    });

    this.socket.on('connect_error', (_err) => {
      this.rootStore.uiStore.errorState = ErrorState.CONNECT_ERROR;
      this.socket.once('connect', () => {
        this.connected = true;
        this.rootStore.uiStore.errorState = undefined;
      });
    });

    this.socket.on('connections-count', (count: number) => {
      this.rootStore.uiStore.nrOfAvailableUsers = count === 1 ? 0 : count - 1;
    });

    this.socket.on('match-found', (...data) => {
      this.rootStore.uiStore.onMatchFound(...data);
    });

    this.socket.on('user-left', () => {
      this.rootStore.callStore.cleanupAfterCall();
      this.rootStore.uiStore.findMatch(true);
    });

    this.socket.on('partner-disconnected', () => {
      this.rootStore.callStore.cleanupAfterCall();
      this.rootStore.uiStore.findMatch();
    });

    this.socket.on('video-toggle', (enabled) => {
      this.rootStore.callStore.remoteVideoEnabled = enabled;
    });

    this.socket.on('audio-toggle', (enabled) => {
      this.rootStore.callStore.remoteAudioEnabled = enabled;
    });
  }

  disconnect() {
    this._socket?.disconnect();
    this.rootStore.uiStore.appState = AppState.START;
    this.rootStore.callStore.cleanupAfterCall();
  }
}
