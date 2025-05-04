import { useEffect, useRef, useCallback } from 'react';
import type { Maybe } from '@mono/common-dto';
import type { Pipe } from '../model/Pipe';
import type { ScaleFactor } from '../model/DrawProps';
import {
  BASE_PLAYER_SIZE_PERCENT,
  PLAYER_X_POS_MULTIPLIER,
} from '../model/constants';
import { CanvasUtil } from '../util/CanvasUtil';
import { CanvasCollisionService } from '../service/CanvasCollisionService';
import { CanvasPlayerService } from '../service/CanvasPlayerService';
import { CanvasPipeService } from '../service/CanvasPipeService';
import { CanvasDrawService } from '../service/CanvasDrawService';

interface In {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onGameOver: (score: number) => void;
  getPitch: () => Maybe<[number, number]>;
  scaleFactor: ScaleFactor;
}

export const useCanvasAnimate = ({
  canvasRef,
  onGameOver,
  getPitch,
  scaleFactor,
}: In) => {
  const requestRef = useRef<number>(null);
  const frameCountRef = useRef<number>(0);

  const pipesRef = useRef<Pipe[]>([]);
  const pipesPassedRef = useRef<number>(0);

  const playerYRef = useRef<number>(0);
  const velocityRef = useRef<number>(0);

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

    const canvasWidth = canvas.width / scaleFactor.devicePixelRatio;

    const pitchData = getPitch();
    if (pitchData) {
      // Use the consolidated CanvasPlayerService
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

    const playerSizePercent = CanvasUtil.getScaledValue(
      BASE_PLAYER_SIZE_PERCENT,
      scaleFactor,
    );
    const playerSize = canvasWidth * playerSizePercent;
    const playerX = canvasWidth * PLAYER_X_POS_MULTIPLIER;

    const pipeHit = CanvasCollisionService.isCollision({
      playerX,
      playerY: playerYRef.current,
      playerWidth: playerSize, // Pass the scaled player width
      playerHeight: playerSize, // Assuming square player
      pipes: pipesRef.current,
      canvasWidth,
      scaleFactor, // Pass the scale factor for additional scaling if needed
    });

    if (pipeHit) {
      endGame();
      return;
    }

    CanvasDrawService.drawCanvas({
      ctx,
      yPos: playerYRef.current,
      pipes: pipesRef.current,
      score: pipesPassedRef.current,
      scaleFactor,
      velocity: velocityRef.current,
      pipeSpeed: CanvasPipeService.getPipeSpeed(pipesPassedRef, scaleFactor),
      frameCount: frameCountRef.current,
    });

    requestRef.current = requestAnimationFrame(animate);
  }, [canvasRef, scaleFactor, getPitch, endGame]);

  // Initialize player position in the middle of the canvas
  useEffect(() => {
    if (canvasRef.current) {
      const canvasHeight =
        canvasRef.current.height / scaleFactor.devicePixelRatio;
      playerYRef.current = canvasHeight / 2;
    }
  }, [playerYRef, canvasRef, scaleFactor]);

  // Initialize and clean up animation loop
  useEffect(() => {
    // Reset game state when scale factor changes
    frameCountRef.current = 0;
    pipesRef.current = [];
    pipesPassedRef.current = 0;

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [animate, scaleFactor]);
};
