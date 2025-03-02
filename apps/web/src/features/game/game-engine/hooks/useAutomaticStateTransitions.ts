import { useCallback, useEffect } from 'react';
import { autorun, reaction, runInAction } from 'mobx';
import { Maybe } from '@mono/common-dto';
import { GameState, GameStore } from '../context/GameStore';

export const useAutomaticStateTransitions = (
  gameStore: GameStore,
  prepareGameSpecifics: Maybe<() => Promise<void>>,
) => {
  const prepareRound = useCallback(async () => {
    if (prepareGameSpecifics) {
      await prepareGameSpecifics();
    }

    runInAction(() => {
      gameStore.state = GameState.PREPARE_ROUND;
    });
  }, [gameStore, prepareGameSpecifics]);

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
