import { useCallback, useRef } from 'react';
import { BASE_PLAYER_SIZE_PERCENT, DEATH_PHYSICS } from '../model/constants';
import { ScaleFactor } from '../model/DrawProps';
import { CanvasPlayerService } from '../service/CanvasPlayerService';
import { CanvasUtil } from '../util/CanvasUtil';

interface In {
  playerXRef: React.RefObject<number>;
  playerYRef: React.RefObject<number>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  velocityRef: React.RefObject<number>;
  scaleFactor: ScaleFactor;
  playEndSound: VoidFunction;
}

export const useDeathAnimation = ({
  velocityRef,
  playerXRef,
  playerYRef,
  canvasRef,
  scaleFactor,
  playEndSound,
}: In) => {
  const isDeadRef = useRef<boolean>(false);
  const deathAnimationFramesRef = useRef<number>(0);

  const initDeathAnimation = useCallback(() => {
    if (isDeadRef.current) return;

    isDeadRef.current = true;
    deathAnimationFramesRef.current = 0;

    // Initial bounce velocity for death animation
    velocityRef.current =
      DEATH_PHYSICS.BOUNCE_VELOCITY * scaleFactor.heightScale;

    playEndSound();
  }, [playEndSound, scaleFactor.heightScale, velocityRef]);

  const animateDeath = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return true;

    const canvasWidth = canvas.width / scaleFactor.devicePixelRatio;
    const canvasHeight = canvas.height / scaleFactor.devicePixelRatio;

    deathAnimationFramesRef.current++;

    CanvasPlayerService.updateDeathAnimation(
      playerXRef,
      playerYRef,
      velocityRef,
      scaleFactor,
    );

    // Check if player has fallen off the screen
    const playerSizePercent = CanvasUtil.getScaledValue(
      BASE_PLAYER_SIZE_PERCENT,
      scaleFactor,
    );
    const playerSize = canvasWidth * playerSizePercent;

    if (
      playerYRef.current > canvasHeight + playerSize ||
      playerXRef.current < -playerSize
    ) {
      return true;
    }

    return false;
  }, [canvasRef, playerXRef, playerYRef, scaleFactor, velocityRef]);

  return {
    isDeadRef,
    deathAnimationFramesRef,

    initDeathAnimation,
    animateDeath,
  };
};
