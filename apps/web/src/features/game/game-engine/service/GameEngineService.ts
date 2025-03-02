import { Assert, RoundData } from '@mono/common-dto';
import { DataChannelMessage, WebRTCService } from '@mono/fe-webrtc';

// Map to track callbacks for proper removal
const _gameRoundListeners = new Map<
  (gameData: RoundData) => void,
  (gameData: RoundData) => void
>();

const _getWebRTCInstance = () => {
  const webRTCInstance = WebRTCService.get();
  Assert.isDefined(webRTCInstance, 'WebRTCService is not defined');
  return webRTCInstance;
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
};

const dispose = () => {
  playerTurnCleanup();
};

export const GameEngineService = {
  notifyRoundStart,
  notifyPlayerTurnComplete,
  notifyTurnSwitch,

  addGameRoundListener,
  removeGameRoundListener,

  playerTurnCleanup,
  dispose,
};
