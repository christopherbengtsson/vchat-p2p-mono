import { useCallback, useEffect, useState } from 'react';
import type { Maybe } from '@mono/common-dto';
import { useGameEngine } from '../../game-engine/hooks/useGameEngine';
import { GameStore } from '../../game-engine/context/GameStore';
import { FlappyBirdService } from '../service/FlappyBirdService';
import { AssetService } from '../service/AssetService';

export const useFlappyBird = (
  gameStore: GameStore,
  setGameActive: (val: boolean) => void,
) => {
  const [remoteCanvasStream, setRemoteCanvasStream] =
    useState<Maybe<MediaStream>>();

  useEffect(() => {
    FlappyBirdService.setRemoteCanvasStream(setRemoteCanvasStream);
    return () => {
      FlappyBirdService.removeRemoteCanvasStream();
    };
  }, [setRemoteCanvasStream]);

  const initGamePerquisites = useCallback(async () => {
    await FlappyBirdService.initGamePerquisites();
    await AssetService.preload();

    return () => {
      FlappyBirdService.gameDispose();
    };
  }, []);

  const { startNewRound, playerTurnComplete, endPlayerRound } = useGameEngine(
    gameStore,
    setGameActive,
    {
      prepareGame: initGamePerquisites,
      disposables: {
        roundDispose: FlappyBirdService.roundDispose,
        gameDispose: FlappyBirdService.gameDispose,
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
