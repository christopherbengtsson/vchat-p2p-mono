import { useCallback, useEffect, useState } from 'react';
import { autorun } from 'mobx';
import { observer } from 'mobx-react';
import { WebRTCService } from '@mono/fe-webrtc';
import { mediaStore } from '@/stores/MediaStore';
import { GameState } from '../../game-engine/model/GameState';
import { useGameStore } from '../../game-engine/context/useGameStore';
import { StartGameAlertDialog } from '../../game-engine/component/StartGameAlertDialog';
import { ResultDialogContainer } from '../../game-engine/container/ResultDialogContainer';
import { usePutinsPuppet } from '../hooks/usePutinsPuppet';
import { PlayerContainer } from './PlayerContainer';
import { SpectatorContainer } from './SpectatorContainer';

interface Props {
  setGameActive: (val: boolean) => void;
}

const toggleMicrophone = (micEnabled: boolean) => {
  // Only control call audio stream for communication/muting opponents
  mediaStore.setLocalAudioEnabled(micEnabled);

  WebRTCService.get()?.sendMessage({
    type: 'AUDIO_TOGGLE',
    toggle: micEnabled,
  });
};

export const PutinsPuppetContainer = observer(function PutinsPuppetContainer({
  setGameActive,
}: Props) {
  const gameStore = useGameStore();

  const {
    startNewRound,
    playerTurnComplete,
    endPlayerRound,
    updateCurrentScore,
    remoteCanvasStream,
    isLoading,
  } = usePutinsPuppet(gameStore, setGameActive);

  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);

  useEffect(
    () =>
      autorun(() => {
        switch (gameStore.state) {
          case GameState.PREPARE_ROUND:
            setShowResultDialog(false);
            setShowStartDialog(true);
            break;

          case GameState.ROUND_END:
          case GameState.GAME_OVER:
            setShowResultDialog(true);
            toggleMicrophone(true);
            break;

          // Toggle microphone not to disturb the user currently playing
          case GameState.PLAYER_TURN:
            toggleMicrophone(true);
            break;

          case GameState.SPECTATOR_TURN:
            toggleMicrophone(false);
            break;
        }
      }),

    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleStartRound = useCallback(async () => {
    setShowStartDialog(false);
    startNewRound();
  }, [startNewRound]);

  const handleScoreUpdate = useCallback(
    (score: number) => {
      updateCurrentScore(score);
    },
    [updateCurrentScore],
  );

  const handlePlayerTurnComplete = useCallback(() => {
    setShowResultDialog(true);
    playerTurnComplete();
  }, [playerTurnComplete]);

  const handleOnResultDialogClose = useCallback(() => {
    setShowResultDialog(false);
    endPlayerRound();
  }, [endPlayerRound]);

  return (
    <>
      {gameStore.state === GameState.PLAYER_TURN ? (
        <PlayerContainer
          score={gameStore.currentScore}
          onEndRound={handlePlayerTurnComplete}
          onScoreUpdate={handleScoreUpdate}
        />
      ) : gameStore.state === GameState.SPECTATOR_TURN ? (
        <SpectatorContainer remoteCanvasStream={remoteCanvasStream} />
      ) : null}

      <StartGameAlertDialog
        open={showStartDialog}
        onClick={handleStartRound}
        gameRound={gameStore.currentRound}
        isLoading={isLoading}
      />

      <ResultDialogContainer
        open={showResultDialog}
        onClick={handleOnResultDialogClose}
        gameComplete={gameStore.isGameOver}
        round={gameStore.currentRound}
        score={gameStore.latestRoundResult?.score || 0}
      />

      {import.meta.env.DEV ||
        // TODO: Temp debug
        // eslint-disable-next-line no-constant-binary-expression
        (true && (
          <div className="fixed bottom-0 left-0 p-2 bg-black/70 text-white text-xs z-50">
            State: {gameStore.state} | Round: {gameStore.currentRound}/
            {gameStore.maxRounds} | My Turn: {gameStore.isMyTurn ? 'Yes' : 'No'}{' '}
            | Score: {gameStore.myTotalScore} vs {gameStore.opponentTotalScore}
            <br />
            Call Audio: {mediaStore.localAudioEnabled ? '🎤' : '🔇'} | Game
            Stream: {mediaStore.localAudioGameStream ? '✅' : '❌'}
          </div>
        ))}
    </>
  );
});
