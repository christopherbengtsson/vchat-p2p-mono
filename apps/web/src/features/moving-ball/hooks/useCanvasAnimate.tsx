import { useEffect, useRef, useCallback } from 'react';
import { AudioAnalyserService } from '../service/AudioAnalyserService';
import { Wall } from '../model/Wall';
import {
  BALL_RADIUS,
  WALL_FREQUENCY,
  WALL_SPEED,
} from '../service/CanvasService';

const isCollision = ({
  ballX,
  ballY,
  walls,
  canvasHeight,
}: {
  walls: Wall[];
  ballX: number;
  ballY: number;
  canvasHeight: number;
}) =>
  walls.some((wall) => {
    if (
      ballX + BALL_RADIUS > wall.x &&
      ballX - BALL_RADIUS < wall.x + wall.width
    ) {
      if (ballY + BALL_RADIUS > canvasHeight - wall.gapHeight) {
        return true;
      }
    }
    return false;
  });

interface In {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  draw: (ctx: CanvasRenderingContext2D, volume: number, walls: Wall[]) => void;
}

export const useCanvasAnimate = ({ canvasRef, draw }: In) => {
  const requestRef = useRef<number>();
  const previousVolumeRef = useRef<number>(0);
  const smoothingFactor = 0.8; // Adjust between 0-1

  const wallsRef = useRef<Wall[]>([]);
  const frameCountRef = useRef<number>(0);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Update volume
    const newVolume = AudioAnalyserService.getVolume();
    const smoothedVolume =
      smoothingFactor * previousVolumeRef.current +
      (1 - smoothingFactor) * newVolume;
    previousVolumeRef.current = smoothedVolume;

    // Update walls
    frameCountRef.current++;
    if (frameCountRef.current % WALL_FREQUENCY === 0) {
      // Add a new wall
      const gapHeight = 100; // Height of the wall
      wallsRef.current.push({
        x: canvas.width,
        width: 20,
        gapY: 0,
        gapHeight,
      });
    }

    // Move walls
    wallsRef.current.forEach((wall) => {
      wall.x -= WALL_SPEED;
    });

    // Remove walls that have gone offscreen
    wallsRef.current = wallsRef.current.filter(
      (wall) => wall.x + wall.width > 0,
    );

    // Collision detection
    const minY = BALL_RADIUS;
    const maxY = canvas.height - BALL_RADIUS;

    const ballX = BALL_RADIUS * 5;
    const ballY = maxY - smoothedVolume * (maxY - minY);

    if (
      isCollision({
        ballX,
        ballY,
        walls: wallsRef.current,
        canvasHeight: canvas.height,
      })
    ) {
      if (requestRef.current) {
        AudioAnalyserService.stop();
        cancelAnimationFrame(requestRef.current);
        return;
      }
    }

    draw(ctx, smoothedVolume, wallsRef.current);

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
