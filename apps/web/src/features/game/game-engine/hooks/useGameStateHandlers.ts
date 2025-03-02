import { useCallback } from 'react';
import { runInAction } from 'mobx';
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
      runInAction(() => {
        gameStore.state = GameState.ROUND_START;
        if (playerId) {
          gameStore.opponentId = playerId;
        }
      });
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

      runInAction(() => {
        gameStore.roundResults.push({
          playerId,
          round,
          score,
        });

        gameStore.state = newState;
      });

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
      runInAction(() => {
        if (gameStore.bothPlayersPlayedRound) {
          gameStore.currentRound++;
        }

        gameStore.isMyTurn = isMyTurn;
        gameStore.state = GameState.IDLE;
      });
    },
    [gameStore],
  );

  return {
    onStartRound,
    onPlayerTurnComplete,
    onSwitchTurns,
  };
};
