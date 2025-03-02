import { useCallback, useState } from 'react';
import { Maybe } from '@mono/common-dto';
import { GameState, GameStore } from '../context/GameStore';
import { GameRoundService } from '../service/GameRoundService';
import { useGameStateHandlers } from './useGameStateHandlers';
import { useAutomaticStateTransitions } from './useAutomaticStateTransitions';
import { useGameStateListeners } from './useGameStateListeners';

export const RESULT_DIALOG_TIMEOUT = 7_000;

export const useGameStateMachine = (
  gameStore: GameStore,
  setGameActive: (val: boolean) => void,
) => {
  const [remoteCanvasStream, setRemoteCanvasStream] =
    useState<Maybe<MediaStream>>(null);

  useAutomaticStateTransitions(gameStore);
  const { onStartRound, onPlayerTurnComplete, onSwitchTurns } =
    useGameStateHandlers(gameStore);
  useGameStateListeners({
    onStartRound,
    onPlayerTurnComplete,
    onSwitchTurns,
    setRemoteCanvasStream,
  });

  const startNewRound = useCallback(() => {
    // Notify other player about new state
    GameRoundService.notifyRoundStart(gameStore.playerId);

    // Set new local state
    onStartRound();
  }, [gameStore.playerId, onStartRound]);

  const playerTurnComplete = useCallback(
    (score: number) => {
      GameRoundService.notifyPlayerTurnComplete({
        playerId: gameStore.playerId,
        round: gameStore.currentRound,
        score,
      });

      // TODO: Move to separate callback to be reused in state listeners
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

    GameRoundService.notifyTurnSwitch();

    onSwitchTurns(false);
  }, [gameStore.isMyTurn, gameStore.state, onSwitchTurns, setGameActive]);

  return {
    startNewRound,
    playerTurnComplete,
    endPlayerRound,

    remoteCanvasStream,
  };
};
