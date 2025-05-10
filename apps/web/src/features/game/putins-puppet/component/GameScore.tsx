import { observer } from 'mobx-react';
import { TypographyH2 } from '@/common/components/typography/Typography';

interface GameScoreProps {
  score: number;
}

export const GameScore = observer(function GameScore({
  score,
}: GameScoreProps) {
  return (
    <div className="absolute top-4 left-4 z-10 pointer-events-none">
      <TypographyH2 className="drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
        Score: {score}
      </TypographyH2>
    </div>
  );
});
