import { makeAutoObservable } from 'mobx';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { CustomError, type Maybe } from '@mono/common-dto';
import { ClientAuthService } from '@mono/fe-supabase';
import {
  DefaultToastState,
  ErrorToastState,
} from '@/common/utils/toast/model/ToastState';
import { showToast } from '@/common/utils/toast/showToast';
import { SupabaseClient } from '@/common/clients/supabase';
import { BrowserSignatureUtil } from '../common/utils/BrowserSignatureUtil';
import { noop } from '../common/utils/noop';
import type { ChatSocket } from './model/SocketModel';
import type { RootStore } from './RootStore';

export class SocketStore {
  private rootStore: RootStore;

  socket: Maybe<ChatSocket>;
  connected = false;

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;

    makeAutoObservable(this);
  }

  get id() {
    const id = this.socket?.id;
    if (!id) {
      showToast(ErrorToastState.CONNECT_ERROR);
      throw CustomError.httpCommunication('Socket id not defined');
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

    this.socket.on('user-reported', this.handleUserReported);
    this.socket.on(
      'request-browser-signature',
      this.handleBrowserSignatureRequest,
    );
  }

  handleConnect = () => {
    this.connected = true;
  };

  handleDisconnect = (reason: string) => {
    this.connected = false;

    console.debug('disconnected');
    if (reason === 'io server disconnect') {
      console.debug('Disconnected by server');
      showToast(ErrorToastState.SERVER_DISCONNECTED);
    }
    // this.rootStore.callStore.resetCallState();
  };

  handleConnectError = (_err: Error) => {
    showToast(ErrorToastState.CONNECT_ERROR);
    this.socket?.once('connect', this.handleSocketReconnect);
  };

  handleSocketReconnect = () => {
    this.connected = true;
    showToast(DefaultToastState.CONNECTION_RESTORED); // TODO: Remove or keep using this showToast util?
  };

  handleUserReported = () => {
    toast('Report Received', {
      description:
        'Warning: Multiple reports can lead to account suspension or ban.',
      dismissible: false,
      duration: Infinity,
      action: {
        label: 'I understand',
        onClick: noop,
      },
    });
  };

  handleBrowserSignatureRequest = async (permanentBan: boolean) => {
    this.socket?.emit('browser-signature', BrowserSignatureUtil.get());

    this.disconnect();
    ClientAuthService.logout(SupabaseClient.instance, 'global').catch((err) => {
      console.error('Failed to logout', err);
    });

    if (permanentBan) {
      this.rootStore.authStore.setPermanentlyBanned(true);
    } else {
      this.rootStore.authStore.setTemporarilyBanned(true);
    }
  };

  disconnect() {
    // this.rootStore.callStore.resetCallState();
    this.socket?.disconnect();
  }
}
