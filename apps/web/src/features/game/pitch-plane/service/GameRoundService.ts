import { Assert, CustomError, Maybe, RoundData } from '@mono/common-dto';
import { DataChannelMessage, WebRTCService } from '@mono/fe-webrtc';
import { MediaStreamService } from '../../../../common/service/MediaStreamService';
import { AudioFrequencyService } from './AudioFrequencyService';

// Map to track callbacks for proper removal
const _gameRoundListeners = new Map<
  (gameData: RoundData) => void,
  (gameData: RoundData) => void
>();
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

    const stream = await MediaStreamService.requestGameAudioStream();
    _audioFrequencyService = new AudioFrequencyService(stream);
    return _audioFrequencyService;
  } catch (error) {
    console.error('Failed to start game audio service', error);
    throw error;
  }
};

const addGameRoundListener = (callback: (gameData: RoundData) => void) => {
  try {
    const webRTCInstance = _getWebRTCInstance();
    _gameRoundListeners.set(callback, callback);
    webRTCInstance.addInjectable('handleGameRoundMessage', callback);
  } catch (error) {
    console.error('Failed to add game round listener', error);
    throw error;
  }
};

const removeGameRoundListener = (callback: (gameData: RoundData) => void) => {
  try {
    const webRTCInstance = _getWebRTCInstance();
    const originalCallback = _gameRoundListeners.get(callback);
    if (originalCallback) {
      webRTCInstance.removeInjectable(
        'handleGameRoundMessage',
        originalCallback,
      );
      _gameRoundListeners.delete(callback);
    }
  } catch (error) {
    console.error('Failed to remove game round listener', error);
  }
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
  try {
    const webRTCInstance = _getWebRTCInstance();
    webRTCInstance.removeInjectable('setRemoteCanvasStream');
  } catch (error) {
    console.error('Failed to remove remote canvas stream', error);
  }
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
    const webRTCInstance = _getWebRTCInstance();
    webRTCInstance.removeCanvasStream();
  } catch (error) {
    console.error('Failed to stop canvas stream', error);
  }
};

const getPitch = () => {
  if (!_audioFrequencyService) {
    throw CustomError.badState('AudioFrequencyService is not initialized');
  }
  return _audioFrequencyService.getPitch();
};

const notifyRoundStart = (playerId: string) => {
  try {
    const webRTCInstance = _getWebRTCInstance();
    const payload: DataChannelMessage = {
      type: 'GAME',
      data: {
        state: 'START_ROUND',
        playerId,
      },
    };
    webRTCInstance.sendMessage(payload);
  } catch (error) {
    console.error('Failed to start round', error);
    throw error;
  }
};

const notifyPlayerTurnComplete = (roundData: {
  playerId: string;
  round: number;
  score: number;
}) => {
  try {
    const webRTCInstance = _getWebRTCInstance();
    const payload: DataChannelMessage = {
      type: 'GAME',
      data: {
        state: 'PLAYER_TURN_COMPLETE',
        playerId: roundData.playerId,
        round: roundData.round,
        score: roundData.score,
      },
    };
    webRTCInstance.sendMessage(payload);
  } catch (error) {
    console.error('Failed to notify player turn complete', error);
    throw error;
  }
};

const notifyTurnSwitch = () => {
  try {
    const webRTCInstance = _getWebRTCInstance();
    const payload: DataChannelMessage = {
      type: 'GAME',
      data: {
        state: 'SWITCH_TURNS',
      },
    };
    webRTCInstance.sendMessage(payload);
  } catch (error) {
    console.error('Failed to end round', error);
    throw error;
  }
};

const playerTurnCleanup = () => {
  _gameRoundListeners.clear();
  if (_audioFrequencyService) {
    _audioFrequencyService.close();
    _audioFrequencyService = null;
  }
  stopCanvasStream();
};

const dispose = () => {
  playerTurnCleanup();
  removeRemoteCanvasStream();
};

export const GameRoundService = {
  initGamePerquisites,
  getPitch,

  notifyRoundStart,
  notifyPlayerTurnComplete,
  notifyTurnSwitch,

  setRemoteCanvasStream,
  removeRemoteCanvasStream,

  addGameRoundListener,
  removeGameRoundListener,

  startCanvasStream,
  stopCanvasStream,

  playerTurnCleanup,
  dispose,
};
