import { makeAutoObservable, observable, runInAction } from 'mobx';
import { type Socket, io } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@mono/common-dto';
import { MediaStreamService } from '../services/MediaStreamService';
import { WebRTCService } from '../services/WebRTCService';
import { AuthStore } from './AuthStore';
import { AppState } from './model/AppState';
import { ErrorState } from './model/ErrorState';

export class MainStore {
  authStore: AuthStore;
  webRTC: WebRTCService | undefined;

  maybeSocket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  isSocketConnected = false;

  appState: AppState = AppState.START;
  errorState: ErrorState | undefined = undefined;

  inCall = false;

  mainMediaStream: MediaStream | null = null;
  secondaryMediaStream: MediaStream | null = null;

  localVideoEnabled = true;
  localAudioEnabled = true;
  remoteVideoEnabled = true;
  remoteAudioEnabled = true;

  nrOfAvailableUsers = 0;
  partnerId: string | undefined;
  roomId: string | undefined;

  constructor() {
    this.authStore = new AuthStore();
    void this.initLocalVideo();

    makeAutoObservable(this, {
      // TODO: Check overrides
      /**
       * Like observable, but only reassignments will be tracked.
       * The assigned values are completely ignored and will NOT be
       * automatically converted to observable/autoAction/flow.
       * For example, use this if you intend to store immutable data in an observable field.
       */
      maybeSocket: observable.ref,
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

    this.setupListeners();
  }
  disconnect() {
    this.maybeSocket?.disconnect();
    this.setAppState(AppState.START);
    this.cleanupAfterCall();
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
    if (this.roomId) {
      this.socket.emit('leave-room', this.roomId, this.id);
    }

    this.cleanupAfterCall();
    this.findMatch();
  }
  async toggleVideo() {
    if (!this.roomId || !this.webRTC) {
      return;
    }

    const toggle = !this.localVideoEnabled;

    this.webRTC.toggleVideo(toggle);

    this.socket.emit('video-toggle', toggle, this.roomId);

    runInAction(() => {
      this.localVideoEnabled = toggle;
    });
  }

  toggleAudio() {
    if (!this.roomId || !this.webRTC) {
      return;
    }

    const toggle = !this.localAudioEnabled;

    this.webRTC.toggleAudio(toggle);
    this.socket.emit('audio-toggle', toggle, this.roomId);

    runInAction(() => {
      this.localAudioEnabled = toggle;
    });
  }

  private async initLocalVideo() {
    const stream = await MediaStreamService.requestAudioAndVideoStream();
    runInAction(() => {
      this.mainMediaStream = stream;
    });
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

    this.socket.on('video-toggle', (enabled) =>
      runInAction(() => (this.remoteVideoEnabled = enabled)),
    );
    this.socket.on('audio-toggle', (enabled) =>
      runInAction(() => (this.remoteAudioEnabled = enabled)),
    );
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
      this.cleanupAfterCall();
    }

    this.setAppState(AppState.START);
  }
  private async onMatchFound(
    roomId: string,
    partnerId: string,
    isPolite: boolean,
  ) {
    if (!this.mainMediaStream) {
      throw new Error('No local media stream found');
    }
    console.log('match found', partnerId);
    this.setAppState(AppState.MATCH_FOUND);
    this.joinRoom(roomId);
    this.roomId = roomId;
    this.partnerId = partnerId;

    const onRemoteStream = () => {
      runInAction(() => {
        this.remoteVideoEnabled =
          this.webRTC?.remoteStream?.getVideoTracks()?.at(0)?.enabled ?? false;
        this.remoteAudioEnabled =
          this.webRTC?.remoteStream?.getAudioTracks()?.at(0)?.enabled ?? false;
      });
    };

    this.webRTC = new WebRTCService(
      this.socket,
      this.mainMediaStream,
      onRemoteStream,
      roomId,
      partnerId,
      isPolite,
    );

    setTimeout(() => {
      runInAction(() => {
        // Swap videos
        this.mainMediaStream = this.webRTC?.remoteStream ?? null;
        this.secondaryMediaStream = this.webRTC?.localStream ?? null;

        this.inCall = true;
      });

      this.setAppState(AppState.IN_CALL);
    }, 1500);
  }

  private async onUserLeft() {
    console.log('user left');
    this.cleanupAfterCall();
    this.setAppState(AppState.IN_QUEUE);
    this.findMatch();
  }

  private cleanupAfterCall() {
    console.log('Cleaning up after call...');
    runInAction(() => {
      this.mainMediaStream = this.webRTC?.localStream ?? null;
    });

    // this.webRTC?.toggleVideo(true);
    this.webRTC?.cleanup();
    this.webRTC = undefined;
    this.roomId = undefined;
    this.partnerId = undefined;
    this.inCall = false;
  }
}
