import { useMemo } from 'react';
import { observer } from 'mobx-react';
import { DrawerDialog } from '@/common/components/drawer-dialog/DrawerDialog';
import { Button } from '@/common/components/ui/button';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { ResultDialogContent } from '../component/ResultDialogContent';

export const ResultDialogContainer = observer(function ResultDialogContainer() {
  const { gameStore } = useRootStore();

  const dialogContent = useMemo(() => {
    return {
      title: gameStore.gameComplete
        ? 'Game finished'
        : `Round ${gameStore.round} finished`,
      description: gameStore.gameComplete ? `some desc` : `some desc`,
      ctaText: gameStore.partnersTurn ? 'Close' : 'Next round',
    };
  }, [gameStore.gameComplete, gameStore.partnersTurn, gameStore.round]);

  const handleResultDialogToggle = () => {
    const toggle = !gameStore.resultDialogOpen;
    gameStore.toggleResultDialog(toggle);

    if (!toggle) {
      if (gameStore.gameComplete) {
        gameStore.cleanupGame();
      } else {
        if (gameStore.partnersTurn) {
          gameStore.setStartNewRoundDialogOpen(true);
        }
      }
    }
  };

  if (!gameStore) return null;

  return (
    <DrawerDialog
      open={gameStore.resultDialogOpen}
      toggle={handleResultDialogToggle}
      title={dialogContent.title}
      description={dialogContent.description}
      mainContent={
        <ResultDialogContent
          round={gameStore.round}
          userScore={gameStore.userScore}
        />
      }
      footerContent={
        <Button variant="secondary" onClick={handleResultDialogToggle}>
          Close
        </Button>
      }
    />
  );
});
