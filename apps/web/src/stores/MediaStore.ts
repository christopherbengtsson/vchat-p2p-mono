import { makeAutoObservable } from 'mobx';
import { PermissionService } from '@/common/service/PermissionService';
import { LocalStorageService } from '@/common/service/LocalStorageService';
import { STORAGE_KEYS } from '@/common/model/LocalStorageKeys';
import { PromtState } from '@/common/model/PromptState';
import { MediaStreamService } from '@/common/service/MediaStreamService';
import {
  ToastState,
  ErrorToastState,
} from '@/common/utils/toast/model/ToastState';
import { showToast } from '@/common/utils/toast/showToast';
import { RootStore } from './RootStore';

export class MediaStore {
  private _rootStore: RootStore;
  private _stream: MediaStream | null = null;
  private _videoEnabled = true;
  private _audioEnabled = true;

  constructor(rootStore: RootStore) {
    makeAutoObservable(this);
    this._rootStore = rootStore;
  }

  get maybeStream() {
    return this._stream;
  }

  get stream(): MediaStream {
    if (!this._stream) {
      throw new Error('Local stream is not available');
    }
    return this._stream;
  }
  set stream(stream: MediaStream | null) {
    this._stream = stream;
  }

  get videoEnabled() {
    return this._videoEnabled;
  }
  set videoEnabled(toggle: boolean) {
    this.stream.getVideoTracks()[0].enabled = toggle;
    this._videoEnabled = toggle;
  }

  get audioEnabled() {
    return this._audioEnabled;
  }
  set audioEnabled(toggle: boolean) {
    this.stream.getAudioTracks()[0].enabled = toggle;
    this._audioEnabled = toggle;
  }

  async checkMediaPermissions() {
    const state = await PermissionService.checkMediaPermissions();
    if (state === 'granted') {
      return await this.requestAudioAndVideoStream();
    }

    const storedState = LocalStorageService.get(STORAGE_KEYS.MEDIA_PERMISSIONS);

    if (storedState === 'granted') {
      return await this.requestAudioAndVideoStream();
    }

    this._rootStore.uiStore.promptState = PromtState.PERMISSIONS;
  }

  async requestAudioAndVideoStream() {
    try {
      const stream = await MediaStreamService.requestAudioAndVideoStream();

      this.stream = stream;
      this.videoEnabled = stream.getVideoTracks()[0].enabled;
      this.audioEnabled = stream.getAudioTracks()[0].enabled;

      LocalStorageService.set(STORAGE_KEYS.MEDIA_PERMISSIONS, 'granted');
    } catch (error: DOMException | unknown) {
      const errorState = this.getDomExceptionError(error as DOMException);

      showToast(errorState);

      LocalStorageService.set(STORAGE_KEYS.MEDIA_PERMISSIONS, 'denied');
    }
  }

  private getDomExceptionError(error: DOMException): ToastState {
    switch (error.name) {
      case 'NotAllowedError':
        return ErrorToastState.MEDIA_STREAM_NOT_ALLOWED;

      case 'NotFoundError':
      case 'NotReadableError':
        return ErrorToastState.MEDIA_STREAM_NOT_AVAILABLE;

      default:
        console.error('requestAudioAndVideoStream()', error);
        return ErrorToastState.MEDIA_STREAM_UNKNOWN;
    }
  }
}
