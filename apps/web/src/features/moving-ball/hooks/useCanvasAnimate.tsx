import { useEffect, useRef, useCallback } from 'react';
import { AudioAnalyserService } from '../service/AudioAnalyserService';
import { Wall } from '../model/Wall';
import {
  BALL_RADIUS,
  SMOOTHING_FRAMES,
  VOLUME_THRESHOLD,
  VOLUME_SCALE,
  BALL_X_POS_MULTIPLIER,
} from '../model/CanvasConstants';
import { DrawProps } from '../model/DrawProps';
import { CanvasCollisionService } from '../service/CanvasCollisionService';
import { CanvasBallService } from '../service/CanvasBallService';
import { CanvasWallService } from '../service/CanvasWallService';

interface In {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  draw: (drawProps: DrawProps) => void;
}

export const useCanvasAnimate = ({ canvasRef, draw }: In) => {
  const requestRef = useRef<number>();
  const frameCountRef = useRef<number>(0);

  const wallsRef = useRef<Wall[]>([]);
  const wallsPassedRef = useRef<number>(0);

  const ballYRef = useRef<number>(0);
  const velocityRef = useRef<number>(0);

  const volumeHistory = useRef<number[]>([]);

  const endGame = () => {
    if (!requestRef.current) {
      return;
    }

    AudioAnalyserService.stop();
    cancelAnimationFrame(requestRef.current);
  };

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get the normalized volume (0 to 1)
    const rawVolume = AudioAnalyserService.getVolume();
    // Make it easier to reach the top
    const scaledVolume = Math.min(rawVolume * VOLUME_SCALE, 1);
    // Cancel out small noises
    const volume = scaledVolume < VOLUME_THRESHOLD ? 0 : scaledVolume;

    volumeHistory.current.push(volume);
    if (volumeHistory.current.length > SMOOTHING_FRAMES) {
      volumeHistory.current.shift();
    }
    const smoothedVolume =
      volumeHistory.current.reduce((sum, v) => sum + v, 0) /
      volumeHistory.current.length;

    CanvasBallService.updateBallPositionByVelocity(
      smoothedVolume,
      velocityRef,
      ballYRef,
    );
    CanvasBallService.setBallBoundaries(ballYRef, canvas, velocityRef);

    CanvasWallService.addWall(frameCountRef, wallsRef, canvas);
    CanvasWallService.moveWalls(wallsRef, wallsPassedRef);
    CanvasWallService.removeWalls(wallsRef);

    const wallHit = CanvasCollisionService.isCollision({
      ballX: BALL_RADIUS * BALL_X_POS_MULTIPLIER,
      ballY: ballYRef.current,
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
    });

    requestRef.current = requestAnimationFrame(animate);
  }, [canvasRef, draw]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [animate]);
};
