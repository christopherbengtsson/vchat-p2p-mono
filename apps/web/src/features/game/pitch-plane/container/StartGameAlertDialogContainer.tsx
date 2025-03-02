import { observer } from 'mobx-react';
import { StartGameAlertDialog } from '../component/StartGameAlertDialog';

interface Props {
  startGame: () => Promise<void>;
  startNewRoundDialogOpen: boolean;
  gameRound: number;
}

export const StartGameAlertDialogContainer = observer(
  function StartGameAlertDialogContainer({
    gameRound,
    startGame,
    startNewRoundDialogOpen,
  }: Props) {
    const onClick = async () => {
      await startGame();
    };

    return (
      <StartGameAlertDialog
        open={startNewRoundDialogOpen}
        onClick={onClick}
        gameRound={gameRound}
      />
    );
  },
);
