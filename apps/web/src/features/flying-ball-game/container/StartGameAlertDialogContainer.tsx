import { observer } from 'mobx-react';
import { StartGameAlertDialog } from '../component/StartGameAlertDialog';
import { useCallStore } from '../../call/context/useCallStore';

export const StartGameAlertDialogContainer = observer(
  function StartGameAlertDialogContainer() {
    const { gameStore } = useCallStore();

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
