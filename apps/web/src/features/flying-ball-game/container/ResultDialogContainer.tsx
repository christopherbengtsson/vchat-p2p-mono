import { useMemo } from 'react';
import { observer } from 'mobx-react';
import { DrawerDialog } from '@/common/components/drawer-dialog/DrawerDialog';
import { Button } from '@/common/components/ui/button';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { ResultDialogContent } from '../component/ResultDialogContent';

export const ResultDialogContainer = observer(function ResultDialogContainer() {
  const { gameStore } = useRootStore();

  const dialogContent = useMemo(() => {
    const gameComplete = gameStore.round === gameStore.maxRounds;

    return {
      title: gameComplete
        ? 'Game finished'
        : `Round ${gameStore.round} finished`,
      description: gameComplete ? `` : ``,
      ctaText: gameStore.partnersTurn ? 'Close' : 'Next round',
      gameComplete,
    };
  }, [gameStore.maxRounds, gameStore.partnersTurn, gameStore.round]);

  const handleResultDialogToggle = () => {
    const toggle = !gameStore.resultDialogOpen;
    gameStore.resultDialogOpen = toggle;

    if (!toggle) {
      if (dialogContent.gameComplete) {
        gameStore.cleanupGame();
      } else {
        if (gameStore.partnersTurn) {
          gameStore.startNewRoundDialogOpen = true;
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
