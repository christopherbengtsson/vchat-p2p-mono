import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { CustomError, Maybe } from '@mono/common-dto';
import { useGameEngine } from '../../game-engine/hooks/useGameEngine';
import { GameStore } from '../../game-engine/context/GameStore';
import { FlappyTrumpService } from '../service/FlappyTrumpService';
import { AssetService } from '../service/AssetService';
import { CanvasDrawService } from '../service/CanvasDrawService';

export const useFlappyTrump = (
  gameStore: GameStore,
  setGameActive: (val: boolean) => void,
) => {
  const [remoteCanvasStream, setRemoteCanvasStream] =
    useState<Maybe<MediaStream>>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    FlappyTrumpService.setRemoteCanvasStream(setRemoteCanvasStream);
    return () => {
      FlappyTrumpService.removeRemoteCanvasStream();
    };
  }, [setRemoteCanvasStream]);

  const handleInitError = useCallback(
    (error: CustomError) => {
      console.error('Failed to initialize game:', error);
      toast.error('Failed to initialize game');
      setIsLoading(false);
      setGameActive(false);
    },
    [setGameActive],
  );

  const initGamePerquisites = useCallback(async () => {
    try {
      await FlappyTrumpService.initGamePerquisites();

      let isMounted = true;
      const preloadPromise = AssetService.preload();

      preloadPromise
        .then(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        })
        .catch((error) => {
          if (isMounted) {
            handleInitError(error);
          }
        });

      return () => {
        isMounted = false;
        FlappyTrumpService.gameDispose();
        CanvasDrawService.clearCache();
      };
    } catch (error) {
      handleInitError(error as CustomError);
      return () => {
        FlappyTrumpService.gameDispose();
        CanvasDrawService.clearCache();
      };
    }
  }, [handleInitError]);

  const { startNewRound, playerTurnComplete, endPlayerRound } = useGameEngine(
    gameStore,
    setGameActive,
    {
      prepareGame: initGamePerquisites,
      disposables: {
        roundDispose: () => {
          FlappyTrumpService.roundDispose();
          CanvasDrawService.clearCache();
        },
        gameDispose: () => {
          FlappyTrumpService.gameDispose();
          CanvasDrawService.clearCache();
        },
      },
    },
  );

  return {
    startNewRound,
    playerTurnComplete,
    endPlayerRound,
    remoteCanvasStream,
    isLoading,
  };
};
