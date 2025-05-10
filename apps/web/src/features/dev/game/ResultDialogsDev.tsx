import { useState } from 'react';
import { ResultDialogContainer } from '../../game/game-engine/container/ResultDialogContainer';

export function ResultsDialogDev() {
  const [open, setOpen] = useState(false);
  const gameComplete = true;
  const round = 1;
  const score = 4;

  const handleClick = () => {
    setOpen(!open);
  };

  return (
    <>
      <button onClick={handleClick}>Toggle ResultDialogContainer</button>
      <ResultDialogContainer
        open={open}
        onClick={handleClick}
        gameComplete={gameComplete}
        round={round}
        score={score}
      />
    </>
  );
}
