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

  socket: ChatSocket | null = null;
  connected = false;

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;

    makeAutoObservable(this);
  }

  get id() {
    const id = this.socket?.id ?? null;
    if (!id) {
      showToast(ErrorToastState.CONNECT_ERROR);
      throw new Error('Socket id not defined');
    }
    return id;
  }

  connect() {
    this.socket = io(`${import.meta.env.VITE_SERVER_URL}/video-chat`, {
      withCredentials: true,
      extraHeaders: {
        authorization: `Bearer ${this.rootStore.authStore.session?.access_token}`,
      },
    });

    this.socket.io.engine.on('error', (error) => {
      console.error('engine error', error);
    });
    this.socket.io.engine.on('upgradeError', (error) => {
      console.warn('engine upgradeError', error);
    });

    this.socket.io.on('reconnect_error', (error) => {
      console.error('io reconnect_error', error);
    });
    this.socket.io.on('error', (error) => {
      console.error('io error', error);
    });

    this.socket.on('connect', this.handleConnect);
    this.socket.on('disconnect', this.handleDisconnect);
    this.socket.on('connect_error', this.handleConnectError);
  }

  handleConnect = () => {
    this.connected = true;
  };

  handleDisconnect = (reason: string) => {
    this.connected = false;

    console.log('disconnected');
    if (reason === 'io server disconnect') {
      console.log('Disconnected by server');
      showToast(ErrorToastState.SERVER_DISCONNECTED);
    }
    this.rootStore.callStore.resetCallState();
  };

  handleConnectError = (_err: Error) => {
    showToast(ErrorToastState.CONNECT_ERROR);
    this.socket?.once('connect', this.handleSocketReconnect);
  };

  handleSocketReconnect = () => {
    this.connected = true;
    showToast(DefaultToastState.CONNECTION_RESTORED);
  };

  disconnect() {
    this.socket?.disconnect();
    this.socket?.io.engine.off('error');
    this.socket?.io.engine.off('upgradeError');
    this.socket?.io.off('reconnect_error');
    this.socket?.io.off('error');
    this.socket?.off('connect');
    this.socket?.off('disconnect');
    this.rootStore.callStore.resetCallState();
  }
}
