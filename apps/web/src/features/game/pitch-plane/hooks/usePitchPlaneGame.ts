import { useCallback, useEffect, useState } from 'react';
import type { Maybe } from '@mono/common-dto';
import { useGameEngine } from '../../game-engine/hooks/useGameEngine';
import { GameStore } from '../../game-engine/context/GameStore';
import { PitchPlaneService } from '../service/PitchPlaneService';

export const usePitchPlaneGame = (
  gameStore: GameStore,
  setGameActive: (val: boolean) => void,
) => {
  const initGamePerquisites = useCallback(async () => {
    await PitchPlaneService.initGamePerquisites();

    return () => {
      PitchPlaneService.gameDispose();
    };
  }, []);

  const { startNewRound, playerTurnComplete, endPlayerRound } = useGameEngine(
    gameStore,
    setGameActive,
    {
      prepareGame: initGamePerquisites,
      disposables: {
        roundDispose: PitchPlaneService.roundDispose,
        gameDispose: PitchPlaneService.gameDispose,
      },
    },
  );

  const [remoteCanvasStream, setRemoteCanvasStream] =
    useState<Maybe<MediaStream>>();

  useEffect(() => {
    PitchPlaneService.setRemoteCanvasStream(setRemoteCanvasStream);
    return () => {
      PitchPlaneService.removeRemoteCanvasStream();
    };
  }, [setRemoteCanvasStream]);

  return {
    startNewRound,
    playerTurnComplete,
    endPlayerRound,
    remoteCanvasStream,
  };
};
