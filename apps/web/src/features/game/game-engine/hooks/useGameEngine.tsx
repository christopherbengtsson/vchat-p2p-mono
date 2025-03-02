import { useCallback } from 'react';
import { Maybe } from '@mono/common-dto';
import { GameState, GameStore } from '../context/GameStore';
import { GameSpecificDispose } from '../model/GameSpecificDispose';
import { GameEngineService } from '../service/GameEngineService';
import { useAutomaticStateTransitions } from './useAutomaticStateTransitions';
import { useGameStateHandlers } from './useGameStateHandlers';
import { useGameStateListeners } from './useGameStateListeners';

export const RESULT_DIALOG_TIMEOUT = 7_000;

interface GameSpecifics {
  prepareGame: Maybe<() => Promise<void>>;
  disposables: Maybe<GameSpecificDispose>;
}

export const useGameEngine = (
  gameStore: GameStore,
  setGameActive: (val: boolean) => void,
  gameSpecifics: GameSpecifics,
) => {
  useAutomaticStateTransitions(gameStore, gameSpecifics.prepareGame);
  const { onStartRound, onPlayerTurnComplete, onSwitchTurns } =
    useGameStateHandlers(gameStore, gameSpecifics.disposables);
  useGameStateListeners({
    onStartRound,
    onPlayerTurnComplete,
    onSwitchTurns,
  });

  const startNewRound = useCallback(() => {
    // Notify other player about new state
    GameEngineService.notifyRoundStart(gameStore.playerId);

    // Set new local state
    onStartRound();
  }, [gameStore.playerId, onStartRound]);

  const playerTurnComplete = useCallback(
    (score: number) => {
      GameEngineService.notifyPlayerTurnComplete({
        playerId: gameStore.playerId,
        round: gameStore.currentRound,
        score,
      });

      onPlayerTurnComplete(gameStore.playerId, score, gameStore.currentRound);
    },
    [gameStore.currentRound, gameStore.playerId, onPlayerTurnComplete],
  );

  const endPlayerRound = useCallback(() => {
    if (gameStore.state === GameState.GAME_OVER) {
      setGameActive(false);
      return;
    }

    if (!gameStore.isMyTurn) {
      return;
    }

    GameEngineService.notifyTurnSwitch();

    onSwitchTurns(false);
  }, [gameStore.isMyTurn, gameStore.state, onSwitchTurns, setGameActive]);

  return {
    startNewRound,
    playerTurnComplete,
    endPlayerRound,
  };
};
