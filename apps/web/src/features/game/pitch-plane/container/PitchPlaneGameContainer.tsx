import { useCallback, useEffect, useState } from 'react';
import { autorun } from 'mobx';
import { observer } from 'mobx-react';
import { GameState } from '../../game-engine/model/GameState';
import { useGameStore } from '../../game-engine/context/useGameStore';
import { StartGameAlertDialog } from '../../game-engine/component/StartGameAlertDialog';
import { ResultDialogContainer } from '../../game-engine/container/ResultDialogContainer';
import { usePitchPlaneGame } from '../hooks/usePitchPlaneGame';
import { PlayerContainer } from './PlayerContainer';
import { SpectatorContainer } from './SpectatorContainer';

interface Props {
  setGameActive: (val: boolean) => void;
}

export const PitchPlaneGameContainer = observer(
  function PitchPlaneGameContainer({ setGameActive }: Props) {
    const gameStore = useGameStore();

    const {
      startNewRound,
      playerTurnComplete,
      endPlayerRound,
      remoteCanvasStream,
    } = usePitchPlaneGame(gameStore, setGameActive);

    const [showStartDialog, setShowStartDialog] = useState(false);
    const [showResultDialog, setShowResultDialog] = useState(false);

    useEffect(
      () =>
        autorun(() => {
          if (gameStore.state === GameState.PREPARE_ROUND) {
            setShowResultDialog(false);
            setShowStartDialog(true);
          } else if (
            gameStore.state === GameState.ROUND_END ||
            gameStore.state === GameState.GAME_OVER
          ) {
            setShowResultDialog(true);
          }
        }),

      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
    );

    const handleStartRound = useCallback(async () => {
      setShowStartDialog(false);
      startNewRound();
    }, [startNewRound]);

    const handlePlayerTurnComplete = useCallback(
      (score: number) => {
        setShowResultDialog(true);
        playerTurnComplete(score);
      },
      [playerTurnComplete],
    );

    const handleOnResultDialogClose = useCallback(() => {
      setShowResultDialog(false);
      endPlayerRound();
    }, [endPlayerRound]);

    return (
      <>
        {gameStore.state === GameState.PLAYER_TURN && (
          <PlayerContainer onEndRound={handlePlayerTurnComplete} />
        )}

        {gameStore.state === GameState.SPECTATOR_TURN && (
          <SpectatorContainer remoteCanvasStream={remoteCanvasStream} />
        )}

        <StartGameAlertDialog
          open={showStartDialog}
          onClick={handleStartRound}
          gameRound={gameStore.currentRound}
        />

        <ResultDialogContainer
          open={showResultDialog}
          onClick={handleOnResultDialogClose}
          gameComplete={gameStore.isGameOver}
          round={gameStore.currentRound}
          score={gameStore.latestRoundResult?.score || 0}
        />

        {import.meta.env.DEV && (
          <div className="fixed bottom-0 left-0 p-2 bg-black/70 text-white text-xs z-50">
            State: {gameStore.state} | Round: {gameStore.currentRound}/
            {gameStore.maxRounds} | My Turn: {gameStore.isMyTurn ? 'Yes' : 'No'}{' '}
            | Score: {gameStore.myTotalScore} vs {gameStore.opponentTotalScore}
          </div>
        )}
      </>
    );
  },
);
