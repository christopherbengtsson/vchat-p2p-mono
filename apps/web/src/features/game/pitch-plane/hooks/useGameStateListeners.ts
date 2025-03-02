import { useCallback, useEffect } from 'react';
import { Maybe, RoundData } from '@mono/common-dto';
import { GameRoundService } from '../service/GameRoundService';

interface Props {
  onStartRound: (playerId: string) => void;
  onPlayerTurnComplete: (
    playerId: string,
    score: number,
    round: number,
  ) => void;
  onSwitchTurns: (isRemote: boolean) => void;
  setRemoteCanvasStream: (stream: Maybe<MediaStream>) => void;
}

export const useGameStateListeners = ({
  onPlayerTurnComplete,
  onStartRound,
  onSwitchTurns,
  setRemoteCanvasStream,
}: Props) => {
  const onMessageCallback = useCallback(
    (roundData: RoundData) => {
      switch (roundData.state) {
        case 'START_ROUND':
          onStartRound(roundData.playerId);
          break;

        case 'PLAYER_TURN_COMPLETE':
          onPlayerTurnComplete(
            roundData.playerId,
            roundData.score,
            roundData.round,
          );
          break;

        case 'SWITCH_TURNS':
          onSwitchTurns(true);
          break;
      }
    },
    [onPlayerTurnComplete, onStartRound, onSwitchTurns],
  );

  useEffect(() => {
    GameRoundService.addGameRoundListener(onMessageCallback);
    return () => {
      GameRoundService.removeGameRoundListener(onMessageCallback);
    };
  }, [onMessageCallback]);

  useEffect(() => {
    GameRoundService.setRemoteCanvasStream(setRemoteCanvasStream);
    return () => {
      GameRoundService.removeRemoteCanvasStream();
    };
  }, [setRemoteCanvasStream]);
};
