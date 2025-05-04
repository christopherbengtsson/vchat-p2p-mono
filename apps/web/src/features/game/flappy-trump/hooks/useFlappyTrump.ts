import { useCallback, useEffect, useState } from 'react';
import type { Maybe } from '@mono/common-dto';
import { useGameEngine } from '../../game-engine/hooks/useGameEngine';
import { GameStore } from '../../game-engine/context/GameStore';
import { FlappyTrumpService } from '../service/FlappyTrumpService';
import { AssetService } from '../service/AssetService';

export const useFlappyTrump = (
  gameStore: GameStore,
  setGameActive: (val: boolean) => void,
) => {
  const [remoteCanvasStream, setRemoteCanvasStream] =
    useState<Maybe<MediaStream>>();

  useEffect(() => {
    FlappyTrumpService.setRemoteCanvasStream(setRemoteCanvasStream);
    return () => {
      FlappyTrumpService.removeRemoteCanvasStream();
    };
  }, [setRemoteCanvasStream]);

  const initGamePerquisites = useCallback(async () => {
    await FlappyTrumpService.initGamePerquisites();
    await AssetService.preload();

    return () => {
      FlappyTrumpService.gameDispose();
    };
  }, []);

  const { startNewRound, playerTurnComplete, endPlayerRound } = useGameEngine(
    gameStore,
    setGameActive,
    {
      prepareGame: initGamePerquisites,
      disposables: {
        roundDispose: FlappyTrumpService.roundDispose,
        gameDispose: FlappyTrumpService.gameDispose,
      },
    },
  );

  return {
    startNewRound,
    playerTurnComplete,
    endPlayerRound,
    remoteCanvasStream,
  };
};
