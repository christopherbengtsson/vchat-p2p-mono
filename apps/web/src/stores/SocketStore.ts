import { makeAutoObservable } from 'mobx';
import { io } from 'socket.io-client';
import {
  DefaultToastState,
  ErrorToastState,
} from '@/common/utils/toast/model/ToastState';
import { showToast } from '@/common/utils/toast/showToast';
import { ChatSocket } from './model/SocketModel';
import type { RootStore } from './RootStore';

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
      showToast(ErrorToastState.CONNECT_ERROR);
      throw new Error('Socket not defined');
    }
    return this._socket;
  }

  get maybeSocket() {
    return this._socket;
  }

  get id() {
    const id = this.socket.id;
    if (!id) {
      showToast(ErrorToastState.CONNECT_ERROR);
      throw new Error('Socket id not defined');
    }
    return id;
  }

  connect() {
    this._socket = io(`${import.meta.env.VITE_SERVER_URL}/video-chat`, {
      withCredentials: true,
      extraHeaders: {
        authorization: `Bearer ${this.rootStore.authStore.session?.access_token}`,
      },
    });

    this._socket.io.engine.on('error', (error) => {
      console.error('engine error', error);
    });
    this._socket.io.engine.on('upgradeError', (error) => {
      console.warn('engine upgradeError', error);
    });

    this._socket.io.on('reconnect_error', (error) => {
      console.error('io reconnect_error', error);
    });
    this._socket.io.on('error', (error) => {
      console.error('io error', error);
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
        showToast(ErrorToastState.SERVER_DISCONNECTED);
      }
      this.rootStore.callStore.resetCallState();
    });

    this.socket.on('connect_error', (_err) => {
      showToast(ErrorToastState.CONNECT_ERROR);
      this.socket.once('connect', () => {
        this.connected = true;
        showToast(DefaultToastState.CONNECTION_RESTORED);
      });
    });
  }

  disconnect() {
    this._socket?.disconnect();
    this.rootStore.callStore.resetCallState();
  }
}
