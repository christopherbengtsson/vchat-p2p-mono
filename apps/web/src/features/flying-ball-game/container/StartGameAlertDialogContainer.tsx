import { observer } from 'mobx-react';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { StartGameAlertDialog } from '../component/StartGameAlertDialog';

export const StartGameAlertDialogContainer = observer(
  function StartGameAlertDialogContainer() {
    const { gameStore } = useRootStore();

    const startGame = async () => {
      await gameStore.startGame();
    };

    return (
      <StartGameAlertDialog
        open={gameStore.startNewRoundDialogOpen}
        onClick={startGame}
        gameRound={gameStore.round}
      />
    );
  },
);
