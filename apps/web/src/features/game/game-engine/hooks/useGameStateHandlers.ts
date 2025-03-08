import { useCallback } from 'react';
import { Maybe } from '@mono/common-dto';
import { GameStore, GameState } from '../context/GameStore';
import { GameSpecificDispose } from '../model/GameSpecificDispose';
import { GameEngineService } from '../service/GameEngineService';

export const useGameStateHandlers = (
  gameStore: GameStore,
  disposables: Maybe<GameSpecificDispose>,
) => {
  const onStartRound = useCallback(
    (playerId?: string) => {
      gameStore.onStartRound(GameState.ROUND_START, playerId);
    },
    [gameStore],
  );

  const onPlayerTurnComplete = useCallback(
    (playerId: string, score: number, round: number) => {
      const nextTurnPlayerId =
        playerId === gameStore.opponentId
          ? gameStore.playerId
          : gameStore.opponentId;

      const nextPlayerHasAlreadyPlayedRound = gameStore.roundResults.some(
        (result) =>
          result.round === round && result.playerId === nextTurnPlayerId,
      );

      const newState =
        round === gameStore.maxRounds && nextPlayerHasAlreadyPlayedRound
          ? GameState.GAME_OVER
          : GameState.ROUND_END;

      gameStore.onPlayerTurnComplete(newState, { playerId, score, round });

      if (newState === GameState.GAME_OVER) {
        GameEngineService.dispose();
        disposables?.gameDispose?.();
      } else {
        GameEngineService.playerTurnCleanup();
        disposables?.roundDispose?.();
      }
    },
    [disposables, gameStore],
  );

  const onSwitchTurns = useCallback(
    (isMyTurn: boolean) => {
      const newRound = gameStore.bothPlayersPlayedRound
        ? gameStore.currentRound + 1
        : gameStore.currentRound;

      gameStore.onSwitchTurns(newRound, isMyTurn, GameState.IDLE);
    },
    [gameStore],
  );

  return {
    onStartRound,
    onPlayerTurnComplete,
    onSwitchTurns,
  };
};
