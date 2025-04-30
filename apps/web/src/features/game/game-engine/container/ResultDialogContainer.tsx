import { useMemo } from 'react';
import { observer } from 'mobx-react';
import { PartyPopper } from 'lucide-react';
import { DrawerDialog } from '@/common/components/drawer-dialog/DrawerDialog';
import { Button } from '@/common/components/ui/button';
import { ResultDialogContent } from '../component/ResultDialogContent';
import { TypographyH1 } from '../../../../common/components/typography/Typography';

interface Props {
  open: boolean;
  onClick: () => void;
  gameComplete: boolean;
  round: number;
  score: number;
  gameType?: string;
  additionalStats?: Record<string, number | string>;
}

export const ResultDialogContainer = observer(function ResultDialogContainer({
  gameComplete,
  open,
  round,
  score,
  onClick,
  gameType = 'Game',
  additionalStats,
}: Props) {
  const dialogContent = useMemo(() => {
    return {
      title: gameComplete ? `${gameType} finished!` : `Round ${round} finished`,
      ctaText: gameComplete ? 'Close' : 'Continue',
    };
  }, [gameComplete, round, gameType]);

  return (
    <DrawerDialog
      open={open}
      toggle={onClick}
      title={
        <div className="flex items-center justify-center gap-2">
          {gameComplete && (
            <PartyPopper className="h-5 w-5 text-yellow-500 animate-pulse" />
          )}
          <TypographyH1>{dialogContent.title}</TypographyH1>
          {gameComplete && (
            <PartyPopper className="h-5 w-5 text-yellow-500 animate-pulse" />
          )}
        </div>
      }
      mainContent={
        <ResultDialogContent
          round={round}
          userScore={score}
          gameType={gameType}
          additionalStats={additionalStats}
        />
      }
      footerContent={
        <div className="w-full flex justify-center">
          <Button onClick={onClick} className="px-8 py-2 font-medium" size="lg">
            {dialogContent.ctaText}
          </Button>
        </div>
      }
    />
  );
});
