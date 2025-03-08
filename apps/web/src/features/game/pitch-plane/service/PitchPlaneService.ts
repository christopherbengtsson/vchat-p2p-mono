import { Assert, CustomError, Maybe } from '@mono/common-dto';
import { WebRTCService } from '@mono/fe-webrtc';
import { MediaStreamService } from '@/common/service/MediaStreamService';
import { mediaStore } from '@/stores/MediaStore';
import { AudioFrequencyService } from './AudioFrequencyService';

let _audioFrequencyService: Maybe<AudioFrequencyService>;

const _getWebRTCInstance = () => {
  const webRTCInstance = WebRTCService.get();
  Assert.isDefined(webRTCInstance, 'WebRTCService is not defined');
  return webRTCInstance;
};

const initGamePerquisites = async () => {
  try {
    if (_audioFrequencyService) {
      _audioFrequencyService.close();
      _audioFrequencyService = null;
    }

    if (!mediaStore.localAudioGameStream) {
      const stream = await MediaStreamService.requestGameAudioStream();
      mediaStore.setGameAudioStream(stream);
    }

    Assert.isDefined(
      mediaStore.localAudioGameStream,
      'Game audio stream is not defined',
    );

    _audioFrequencyService = new AudioFrequencyService(
      mediaStore.localAudioGameStream,
    );
  } catch (error) {
    console.error('Failed to start game audio service', error);
    throw error;
  }
};

const getPitch = () => {
  if (!_audioFrequencyService) {
    throw CustomError.badState('AudioFrequencyService is not initialized');
  }
  return _audioFrequencyService.getPitch();
};

const setRemoteCanvasStream = (callback: (stream: MediaStream) => void) => {
  try {
    const webRTCInstance = _getWebRTCInstance();
    webRTCInstance.addInjectable('setRemoteCanvasStream', callback);
  } catch (error) {
    console.error('Failed to set remote canvas stream', error);
    throw error; // Re-throw to allow callers to handle
  }
};

const removeRemoteCanvasStream = () => {
  const webRTCInstance = WebRTCService.get();
  webRTCInstance?.removeInjectable('setRemoteCanvasStream');
};

const startCanvasStream = (
  canvasElement: Maybe<HTMLCanvasElement>,
): MediaStream | null => {
  if (!canvasElement) {
    console.warn('Canvas element is not provided');
    return null;
  }

  try {
    const webRTCInstance = _getWebRTCInstance();
    const stream = canvasElement.captureStream(30);
    webRTCInstance.addCanvasStream(stream);
    return stream;
  } catch (error) {
    console.error('Failed to capture canvas stream', error);
    throw error;
  }
};

const stopCanvasStream = () => {
  try {
    const webRTCInstance = WebRTCService.get();
    webRTCInstance?.removeCanvasStream();
  } catch (error) {
    console.error('Failed to stop canvas stream', error);
  }
};

const roundDispose = () => {
  if (_audioFrequencyService) {
    _audioFrequencyService.close();
    _audioFrequencyService = null;
  }
  mediaStore.closeLocalGameAudioStream();
  stopCanvasStream();
};

const gameDispose = () => {
  roundDispose();
  removeRemoteCanvasStream();
};

export const PitchPlaneService = {
  initGamePerquisites,
  getPitch,

  setRemoteCanvasStream,
  removeRemoteCanvasStream,

  startCanvasStream,
  stopCanvasStream,

  roundDispose,
  gameDispose,
};
