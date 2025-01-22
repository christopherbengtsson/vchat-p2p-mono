import { useEffect, useRef, useCallback } from 'react';
import { Maybe } from '@mono/common-dto';
import { Wall } from '../model/Wall';
import { PLANE_WIDTH, PLANE_X_POS_MULTIPLIER } from '../model/CanvasConstants';
import { DrawProps } from '../model/DrawProps';
import { CanvasCollisionService } from '../service/CanvasCollisionService';
import { CanvasBallService } from '../service/CanvasBallService';
import { CanvasWallService } from '../service/CanvasWallService';

interface In {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  draw: (drawProps: DrawProps) => void;
  onGameOver: (score: number) => void;
  getPitch: () => Maybe<[number, number]>;
}

export const useCanvasAnimate = ({
  canvasRef,
  draw,
  onGameOver,
  getPitch,
}: In) => {
  const requestRef = useRef<number>();
  const frameCountRef = useRef<number>(0);

  const wallsRef = useRef<Wall[]>([]);
  const wallsPassedRef = useRef<number>(0);

  const ballYRef = useRef<number>(0);
  const velocityRef = useRef<number>(0);

  const endGame = useCallback(() => {
    if (!requestRef.current) {
      return;
    }

    cancelAnimationFrame(requestRef.current);
    onGameOver(wallsPassedRef.current);
  }, [onGameOver]);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pitchData = getPitch();

    if (pitchData) {
      CanvasBallService.setBallPosition(
        pitchData,
        canvas,
        ballYRef,
        velocityRef,
      );
    }

    CanvasBallService.setPlaneBoundaries(ballYRef, canvas, velocityRef);

    CanvasWallService.addWall(frameCountRef, wallsRef, canvas);
    CanvasWallService.moveWalls(wallsRef, wallsPassedRef);
    CanvasWallService.removeWalls(wallsRef);

    const wallHit = CanvasCollisionService.isCollision({
      planeX: PLANE_WIDTH * PLANE_X_POS_MULTIPLIER,
      planeY: ballYRef.current,
      walls: wallsRef.current,
    });

    if (wallHit) {
      endGame();
      return;
    }

    draw({
      ctx,
      yPos: ballYRef.current,
      walls: wallsRef.current,
      score: wallsPassedRef.current,
      velocity: velocityRef.current,
    });

    requestRef.current = requestAnimationFrame(animate);
  }, [canvasRef, draw, endGame, getPitch]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [animate]);
};
