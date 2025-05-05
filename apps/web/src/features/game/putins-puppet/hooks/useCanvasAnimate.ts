import { useEffect, useRef, useCallback } from 'react';
import type { Maybe } from '@mono/common-dto';
import type { Pipe } from '../model/Pipe';
import type { ScaleFactor } from '../model/DrawProps';
import {
  BASE_PLAYER_SIZE_PERCENT,
  PLAYER_X_POS_MULTIPLIER,
} from '../model/constants';
import { CanvasUtil } from '../util/CanvasUtil';
import { AssetService } from '../service/AssetService';
import { CanvasCollisionService } from '../service/CanvasCollisionService';
import { CanvasPlayerService } from '../service/CanvasPlayerService';
import { CanvasPipeService } from '../service/CanvasPipeService';
import { CanvasDrawService } from '../service/CanvasDrawService';
import { useDeathAnimation } from './useDeathAnimation';

interface In {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  endAudioRef: React.RefObject<HTMLAudioElement | null>;
  scaleFactor: ScaleFactor;
  onGameOver: (score: number) => void;
  getPitch: () => Maybe<[number, number]>;
}

export const useCanvasAnimate = ({
  canvasRef,
  endAudioRef,
  scaleFactor,
  onGameOver,
  getPitch,
}: In) => {
  const requestRef = useRef<number>(null);
  const frameCountRef = useRef<number>(0);

  const pipesRef = useRef<Pipe[]>([]);
  const pipesPassedRef = useRef<number>(0);

  const playerYRef = useRef<number>(0);
  const velocityRef = useRef<number>(0);

  const playerXRef = useRef<number>(0);

  const {
    initDeathAnimation,
    animateDeath,
    deathAnimationFramesRef,
    isDeadRef,
  } = useDeathAnimation({
    velocityRef,
    playerXRef,
    playerYRef,
    endAudioRef,
    canvasRef,
    scaleFactor,
  });

  const endGame = useCallback(() => {
    if (!requestRef.current) {
      return;
    }

    cancelAnimationFrame(requestRef.current);
    CanvasDrawService.clearCache();
    onGameOver(pipesPassedRef.current);
  }, [onGameOver]);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!AssetService.areAssetsReady()) {
      requestRef.current = requestAnimationFrame(animate);
      return;
    }

    const canvasWidth = canvas.width / scaleFactor.devicePixelRatio;

    // Update player X position for reference (used in death animation)
    playerXRef.current = canvasWidth * PLAYER_X_POS_MULTIPLIER;

    if (!isDeadRef.current) {
      const pitchData = getPitch();
      if (pitchData) {
        CanvasPlayerService.updatePlayerPosition(
          pitchData,
          canvas,
          playerYRef,
          velocityRef,
          scaleFactor,
        );
      }

      CanvasPipeService.addPipe(
        frameCountRef,
        pipesRef,
        canvas,
        scaleFactor,
        pipesPassedRef,
      );

      CanvasPipeService.movePipes(
        pipesRef,
        pipesPassedRef,
        scaleFactor,
        canvasWidth,
      );

      CanvasPipeService.removePipes(pipesRef);

      // Check for collisions
      const playerSizePercent = CanvasUtil.getScaledValue(
        BASE_PLAYER_SIZE_PERCENT,
        scaleFactor,
      );
      const playerSize = canvasWidth * playerSizePercent;
      const playerX = playerXRef.current;

      const pipeHit = CanvasCollisionService.isCollision({
        playerX,
        playerY: playerYRef.current,
        playerWidth: playerSize,
        playerHeight: playerSize,
        pipes: pipesRef.current,
        canvasWidth,
        scaleFactor,
      });

      if (pipeHit) {
        initDeathAnimation();
      }
    } else {
      const animationFinished = animateDeath();
      const soundFinished = !endAudioRef.current
        ? true
        : endAudioRef.current.ended;

      if (animationFinished && soundFinished) {
        endGame();
        return;
      }
    }

    // Draw the current frame
    CanvasDrawService.drawCanvas({
      ctx,
      xPos: playerXRef.current,
      yPos: playerYRef.current,
      pipes: pipesRef.current,
      score: pipesPassedRef.current,
      scaleFactor,
      velocity: velocityRef.current,
      pipeSpeed: CanvasPipeService.getPipeSpeed(pipesPassedRef, scaleFactor),
      frameCount: frameCountRef.current,
      isDead: isDeadRef.current,
      deathFrames: deathAnimationFramesRef.current,
    });

    // Schedule next frame
    requestRef.current = requestAnimationFrame(animate);
  }, [
    canvasRef,
    scaleFactor,
    isDeadRef,
    deathAnimationFramesRef,
    getPitch,
    initDeathAnimation,
    animateDeath,
    endAudioRef,
    endGame,
  ]);

  // Initialize player position in the middle of the canvas
  useEffect(() => {
    if (canvasRef.current) {
      const canvasHeight =
        canvasRef.current.height / scaleFactor.devicePixelRatio;
      playerYRef.current = canvasHeight / 2;

      const canvasWidth =
        canvasRef.current.width / scaleFactor.devicePixelRatio;
      playerXRef.current = canvasWidth * PLAYER_X_POS_MULTIPLIER;
    }
  }, [playerYRef, canvasRef, scaleFactor]);

  // Initialize and clean up animation loop
  useEffect(() => {
    // Reset game state when scale factor changes
    frameCountRef.current = 0;
    pipesRef.current = [];
    pipesPassedRef.current = 0;
    isDeadRef.current = false;
    deathAnimationFramesRef.current = 0;

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [animate, deathAnimationFramesRef, isDeadRef, scaleFactor]);
};
