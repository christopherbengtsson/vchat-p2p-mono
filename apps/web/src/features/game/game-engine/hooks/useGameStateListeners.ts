import { useCallback, useEffect } from 'react';
import { RoundData } from '@mono/common-dto';
import { GameEngineService } from '../service/GameEngineService';

interface Props {
  onStartRound: (playerId: string) => void;
  onPlayerTurnComplete: (
    playerId: string,
    score: number,
    round: number,
  ) => void;
  onSwitchTurns: (isRemote: boolean) => void;
}

export const useGameStateListeners = ({
  onPlayerTurnComplete,
  onStartRound,
  onSwitchTurns,
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
    GameEngineService.addGameRoundListener(onMessageCallback);
    return () => {
      GameEngineService.removeGameRoundListener(onMessageCallback);
    };
  }, [onMessageCallback]);
};
