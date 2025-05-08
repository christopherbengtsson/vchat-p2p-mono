import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { CustomError, Maybe } from '@mono/common-dto';
import { useGameEngine } from '../../game-engine/hooks/useGameEngine';
import { GameStore } from '../../game-engine/context/GameStore';
import { PutinsPuppetService } from '../service/PutinsPuppetService';
import { AssetService } from '../service/AssetService';
import { CanvasDrawService } from '../service/CanvasDrawService';

export const usePutinsPuppet = (
  gameStore: GameStore,
  setGameActive: (val: boolean) => void,
) => {
  const [remoteCanvasStream, setRemoteCanvasStream] =
    useState<Maybe<MediaStream>>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    PutinsPuppetService.setRemoteCanvasStream(setRemoteCanvasStream);
    return () => {
      PutinsPuppetService.removeRemoteCanvasStream();
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
      await PutinsPuppetService.initGamePerquisites();

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
        PutinsPuppetService.gameDispose();
        CanvasDrawService.clearCache();
      };
    } catch (error) {
      handleInitError(error as CustomError);
      return () => {
        PutinsPuppetService.gameDispose();
        CanvasDrawService.clearCache();
      };
    }
  }, [handleInitError]);

  const {
    startNewRound,
    updateCurrentScore,
    playerTurnComplete,
    endPlayerRound,
  } = useGameEngine(gameStore, setGameActive, {
    prepareGame: initGamePerquisites,
    disposables: {
      roundDispose: () => {
        PutinsPuppetService.roundDispose();
        CanvasDrawService.clearCache();
      },
      gameDispose: () => {
        PutinsPuppetService.gameDispose();
        CanvasDrawService.clearCache();
      },
    },
  });

  return {
    startNewRound,
    updateCurrentScore,
    playerTurnComplete,
    endPlayerRound,
    remoteCanvasStream,
    isLoading,
  };
};
