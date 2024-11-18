import { observer } from 'mobx-react';

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
        <h2>Game Stats (TODO)</h2>
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
