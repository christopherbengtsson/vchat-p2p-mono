import { useCallback, useEffect, useState } from 'react';
import { autorun } from 'mobx';
import { observer } from 'mobx-react';
import { WebRTCService } from '@mono/fe-webrtc';
import { mediaStore } from '@/stores/MediaStore';
import { GameState } from '../../game-engine/model/GameState';
import { useGameStore } from '../../game-engine/context/useGameStore';
import { StartGameAlertDialog } from '../../game-engine/component/StartGameAlertDialog';
import { ResultDialogContainer } from '../../game-engine/container/ResultDialogContainer';
import { useFlappyTrump } from '../hooks/useFlappyTrump';
import { PlayerContainer } from './PlayerContainer';
import { SpectatorContainer } from './SpectatorContainer';

interface Props {
  setGameActive: (val: boolean) => void;
}

const toggleMicrophone = (mute: boolean) => {
  mediaStore.setLocalAudioEnabled(mute);
  WebRTCService.get()?.sendMessage({
    type: 'AUDIO_TOGGLE',
    toggle: mute,
  });
};

export const FlappyTrumpContainer = observer(function FlappyTrumpContainer({
  setGameActive,
}: Props) {
  const gameStore = useGameStore();

  const {
    startNewRound,
    playerTurnComplete,
    endPlayerRound,
    remoteCanvasStream,
  } = useFlappyTrump(gameStore, setGameActive);

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
            toggleMicrophone(false);
            break;

          // Toggle microphone not to disturb the user currently playing
          case GameState.PLAYER_TURN:
            toggleMicrophone(false);
            break;

          case GameState.SPECTATOR_TURN:
            toggleMicrophone(true);
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
          {gameStore.maxRounds} | My Turn: {gameStore.isMyTurn ? 'Yes' : 'No'} |
          Score: {gameStore.myTotalScore} vs {gameStore.opponentTotalScore}
        </div>
      )}
    </>
  );
});
