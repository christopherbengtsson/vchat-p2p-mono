import { MediaStreamService } from '@/common/service/MediaStreamService';
import { STORAGE_KEYS } from '@/common/model/LocalStorageKeys';
import { LocalStorageService } from '@/common/service/LocalStorageService';
import {
  ErrorToastState,
  ToastState,
} from '@/common/utils/toast/model/ToastState';
import { PermissionService } from '@/common/service/PermissionService';

const _getDomExceptionError = (error: DOMException | unknown): ToastState => {
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
};

const getMediaPermissions = async () => {
  const state: PermissionState =
    await PermissionService.checkMediaPermissions();

  if (state === 'granted') {
    return true;
  }

  const storedState = LocalStorageService.get(STORAGE_KEYS.MEDIA_PERMISSIONS);
  if (storedState === 'granted') {
    return true;
  }

  return false;
};

const requestAudioAndVideoStream = async () => {
  try {
    const stream: MediaStream =
      await MediaStreamService.requestAudioAndVideoStream();

    LocalStorageService.set(STORAGE_KEYS.MEDIA_PERMISSIONS, 'granted');

    return { stream, errorState: undefined };
  } catch (error) {
    LocalStorageService.set(STORAGE_KEYS.MEDIA_PERMISSIONS, 'error');
    const toastState = _getDomExceptionError(error as DOMException);
    return { errorState: toastState, stream: undefined };
  }
};

export const FindMatchService = {
  getMediaPermissions,
  requestAudioAndVideoStream,
};
