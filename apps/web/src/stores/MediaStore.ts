import { makeAutoObservable, flow, observable } from 'mobx';
import { PermissionService } from '@/common/service/PermissionService';
import { LocalStorageService } from '@/common/service/LocalStorageService';
import { STORAGE_KEYS } from '@/common/model/LocalStorageKeys';
import { MediaStreamService } from '@/common/service/MediaStreamService';
import {
  ToastState,
  ErrorToastState,
} from '@/common/utils/toast/model/ToastState';

export class MediaStore {
  stream: MediaStream | null = null;
  videoEnabled = true;
  audioEnabled = true;

  constructor() {
    makeAutoObservable(this, {
      stream: observable.ref,

      getMediaPermissions: false,
      requestGameAudioStream: false,
    });
  }

  setVideoEnabled(toggle: boolean) {
    if (!this.stream) {
      return;
    }
    this.stream.getVideoTracks()[0].enabled = toggle;
    this.videoEnabled = toggle;
  }

  setAudioEnabled(toggle: boolean) {
    if (!this.stream) {
      return;
    }
    this.stream.getAudioTracks()[0].enabled = toggle;
    this.audioEnabled = toggle;
  }

  getMediaPermissions = flow(function* (this: MediaStore) {
    const state: PermissionState =
      yield PermissionService.checkMediaPermissions();

    if (state === 'granted') {
      return true;
    }

    const storedState = LocalStorageService.get(STORAGE_KEYS.MEDIA_PERMISSIONS);
    if (storedState === 'granted') {
      return true;
    }

    return false;
  });

  requestAudioAndVideoStream = flow(function* (this: MediaStore) {
    try {
      const stream: MediaStream =
        yield MediaStreamService.requestAudioAndVideoStream();

      this.stream = stream;
      this.videoEnabled = stream.getVideoTracks()[0].enabled;
      this.audioEnabled = stream.getAudioTracks()[0].enabled;

      LocalStorageService.set(STORAGE_KEYS.MEDIA_PERMISSIONS, 'granted');
    } catch (error) {
      LocalStorageService.set(STORAGE_KEYS.MEDIA_PERMISSIONS, 'error');
      return this._getDomExceptionError(error as DOMException);
    }
  });

  closeAudioAndVideoStream() {
    this.stream?.getTracks()?.forEach((track) => {
      track.stop();
    });
  }

  requestGameAudioStream = flow(function* (this: MediaStore) {
    try {
      return yield MediaStreamService.requestGameAudioStream();
    } catch (error) {
      console.error(error);
      throw error;
    }
  });

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
