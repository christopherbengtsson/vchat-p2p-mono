import { makeAutoObservable } from 'mobx';
import { PermissionService } from '@/common/service/PermissionService';
import { LocalStorageService } from '@/common/service/LocalStorageService';
import { STORAGE_KEYS } from '@/common/model/LocalStorageKeys';
import { MediaStreamService } from '@/common/service/MediaStreamService';
import {
  ToastState,
  ErrorToastState,
} from '@/common/utils/toast/model/ToastState';

export class MediaStore {
  private _stream: MediaStream | null = null;
  private _videoEnabled = true;
  private _audioEnabled = true;

  constructor() {
    makeAutoObservable(this);
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

  async getMediaPermissions(): Promise<boolean> {
    const state = await PermissionService.checkMediaPermissions();

    if (state === 'granted') {
      return true;
    }

    const storedState = LocalStorageService.get(STORAGE_KEYS.MEDIA_PERMISSIONS);
    if (storedState === 'granted') {
      return true;
    }

    return false;
  }

  async requestAudioAndVideoStream() {
    try {
      const stream = await MediaStreamService.requestAudioAndVideoStream();

      this.stream = stream;
      this.videoEnabled = stream.getVideoTracks()[0].enabled;
      this.audioEnabled = stream.getAudioTracks()[0].enabled;

      LocalStorageService.set(STORAGE_KEYS.MEDIA_PERMISSIONS, 'granted');
    } catch (error: DOMException | unknown) {
      LocalStorageService.set(STORAGE_KEYS.MEDIA_PERMISSIONS, 'error');
      return this._getDomExceptionError(error as DOMException);
    }
  }

  closeAudioAndVideoStream() {
    this.maybeStream?.getTracks()?.forEach((track) => {
      track.stop();
    });
  }

  async requestGameAudioStream() {
    try {
      return await MediaStreamService.requestGameAudioStream();
    } catch (error: DOMException | unknown) {
      // TODO: Can this happen? Close call?
      console.error(error);
      throw error;
    }
  }

  private _getDomExceptionError(error: DOMException | unknown): ToastState {
    if (!(error as DOMException).name) {
      return ErrorToastState.UNKNOWN_ERROR;
    }

    switch ((error as DOMException).name) {
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
