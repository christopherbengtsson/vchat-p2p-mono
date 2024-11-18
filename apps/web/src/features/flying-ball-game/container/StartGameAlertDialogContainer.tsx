import { useEffect } from 'react';
import { observer } from 'mobx-react';
import { toast } from 'sonner';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { StartGameAlertDialog } from '../component/StartGameAlertDialog';

export const StartGameAlertDialogContainer = observer(
  function StartGameAlertDialogContainer() {
    const { socketStore, callStore, gameStore } = useRootStore();

    useEffect(() => {
      socketStore.maybeSocket?.on('answer-game-invite', (accept) => {
        if (accept) {
          gameStore.startNewRoundDialogOpen = true;
        } else {
          toast('Invitation was declined');
        }
      });

      return () => {
        socketStore.maybeSocket?.off('answer-game-invite');
      };
    }, [gameStore, callStore.roomId, socketStore.maybeSocket]);

    const startGame = () => {
      gameStore.startGame();
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
