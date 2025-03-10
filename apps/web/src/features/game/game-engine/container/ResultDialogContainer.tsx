import { useMemo } from 'react';
import { observer } from 'mobx-react';
import { DrawerDialog } from '@/common/components/drawer-dialog/DrawerDialog';
import { Button } from '@/common/components/ui/button';
import { ResultDialogContent } from '../component/ResultDialogContent';

interface Props {
  open: boolean;
  onClick: () => void;
  gameComplete: boolean;
  round: number;
  score: number;
}

export const ResultDialogContainer = observer(function ResultDialogContainer({
  gameComplete,
  open,
  round,
  score,
  onClick,
}: Props) {
  const dialogContent = useMemo(() => {
    return {
      title: gameComplete ? 'Game finished!' : `Round ${round} finished`,
      description: gameComplete
        ? 'The game is now complete. Check your final score!'
        : `Round ${round} is complete. Get ready for the next round!`,
      ctaText: gameComplete ? 'Close' : 'Next round',
    };
  }, [gameComplete, round]);

  return (
    <DrawerDialog
      open={open}
      toggle={onClick}
      title={dialogContent.title}
      description={dialogContent.description}
      mainContent={<ResultDialogContent round={round} userScore={score} />}
      footerContent={
        <Button variant="secondary" onClick={onClick}>
          {dialogContent.ctaText}
        </Button>
      }
    />
  );
});
