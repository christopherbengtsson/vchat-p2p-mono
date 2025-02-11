import { observer } from 'mobx-react';
import { TypographyH2 } from '@/common/components/typography/Typography';

interface Props {
  userScore: number;
  round: number;
}
export const ResultDialogContent = observer(function ResultDialogContent({
  ...stats
}: Props) {
  return (
    <div>
      <div>
        <TypographyH2>Game Stats (TODO)</TypographyH2>
        <div>
          <div>
            <span>Score: </span>
            <span>{stats.userScore}</span>
          </div>
          <div>
            <span>Round: </span>
            <span>{stats.round}</span>
          </div>
        </div>
      </div>
    </div>
  );
});
