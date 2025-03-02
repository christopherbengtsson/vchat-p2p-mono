import { useCallback, useEffect } from 'react';
import { autorun, reaction, runInAction } from 'mobx';
import { GameState, GameStore } from '../context/GameStore';
import { GameRoundService } from '../service/GameRoundService';

export const useAutomaticStateTransitions = (gameStore: GameStore) => {
  const prepareRound = useCallback(async () => {
    await GameRoundService.initGamePerquisites();
    runInAction(() => {
      gameStore.state = GameState.PREPARE_ROUND;
    });
  }, [gameStore]);

  // Use autorun to also trigger on init
  useEffect(
    () =>
      autorun(() => {
        if (gameStore.isMyTurn && gameStore.state === GameState.IDLE) {
          prepareRound();
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [prepareRound],
  );

  // use reaction to only trigger on state change
  useEffect(
    () =>
      reaction(
        () => gameStore.state,
        (state) => {
          if (state === GameState.ROUND_START) {
            runInAction(() => {
              gameStore.state = gameStore.isMyTurn
                ? GameState.PLAYER_TURN
                : GameState.SPECTATOR_TURN;
            });
          }
        },
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
};
