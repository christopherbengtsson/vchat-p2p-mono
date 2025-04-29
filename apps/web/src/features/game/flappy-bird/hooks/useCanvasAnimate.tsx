import { useEffect, useRef, useCallback } from 'react';
import { Maybe } from '@mono/common-dto';
import { Wall } from '../model/Wall';
import { PLAYER_X_POS_MULTIPLIER } from '../model/CanvasConstants';
import { CanvasCollisionService } from '../service/CanvasCollisionService';
import { CanvasObjectService } from '../service/CanvasObjectService';
import { CanvasWallService } from '../service/CanvasWallService';
import { CanvasDrawService } from '../service/CanvasDrawService';
import { ScaleFactor } from '../model/DrawProps';

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

  const wallsRef = useRef<Wall[]>([]);
  const wallsPassedRef = useRef<number>(0);

  const playerYRef = useRef<number>(0);
  const velocityRef = useRef<number>(0);

  const endGame = useCallback(() => {
    if (!requestRef.current) {
      return;
    }

    cancelAnimationFrame(requestRef.current);
    CanvasDrawService.clearCache();
    onGameOver(wallsPassedRef.current);
  }, [onGameOver]);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const canvasWidth = canvas.width / scaleFactor.devicePixelRatio;

    const pitchData = getPitch();
    if (pitchData) {
      CanvasObjectService.updateObjectPosition(
        pitchData,
        canvas,
        playerYRef,
        velocityRef,
        scaleFactor,
      );
    }

    CanvasWallService.addWall(
      frameCountRef,
      wallsRef,
      canvas,
      scaleFactor,
      wallsPassedRef,
    );

    CanvasWallService.moveWalls(
      wallsRef,
      wallsPassedRef,
      scaleFactor,
      canvasWidth,
    );

    CanvasWallService.removeWalls(wallsRef);

    const playerX = canvasWidth * PLAYER_X_POS_MULTIPLIER;
    const wallHit = CanvasCollisionService.isCollision({
      playerX,
      playerY: playerYRef.current,
      walls: wallsRef.current,
      canvasWidth,
    });

    if (wallHit) {
      endGame();
      return;
    }

    CanvasDrawService.drawCanvas({
      ctx,
      yPos: playerYRef.current,
      walls: wallsRef.current,
      score: wallsPassedRef.current,
      scaleFactor,
      velocity: velocityRef.current,
      wallSpeed: CanvasWallService.getWallSpeed(wallsPassedRef, scaleFactor),
    });

    requestRef.current = requestAnimationFrame(animate);
  }, [canvasRef, endGame, getPitch, scaleFactor, playerYRef, velocityRef]);

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
    wallsRef.current = [];
    wallsPassedRef.current = 0;

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [animate, scaleFactor]);
};
