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
  draw: (ctx: CanvasRenderingContext2D, yPos: number, walls: Wall[]) => void;
}

export const useCanvasAnimate = ({ canvasRef, draw }: In) => {
  const requestRef = useRef<number>();
  const wallsRef = useRef<Wall[]>([]);
  const frameCountRef = useRef<number>(0);

  const volumeHistory = useRef<number[]>([]);
  const SMOOTHING_FRAMES = 35;

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get the normalized volume (0 to 1)
    const rawVolume = AudioAnalyserService.getVolume();

    // Make is easier to reach the top
    const scaleFactor = 2;
    const scaledVolume = Math.min(rawVolume * scaleFactor, 1);

    // Cancel small out noices
    const threshold = 0.1;
    const volume = scaledVolume < threshold ? 0 : scaledVolume;

    volumeHistory.current.push(volume);
    if (volumeHistory.current.length > SMOOTHING_FRAMES) {
      volumeHistory.current.shift();
    }
    const smoothedVolume =
      volumeHistory.current.reduce((sum, v) => sum + v, 0) /
      volumeHistory.current.length;

    // Map volume to Y position
    const minY = BALL_RADIUS;
    const maxY = canvas.height - BALL_RADIUS;
    const usableHeight = maxY - minY;

    // Invert volume so that higher volume moves the ball up (Y decreases upwards)
    const ballY = maxY - smoothedVolume * usableHeight;

    // Update walls (if necessary)
    frameCountRef.current++;
    if (frameCountRef.current % WALL_FREQUENCY === 0) {
      // Add a new wall (if your game uses walls)
      const gapHeight = 100; // Adjust as needed
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

    // Remove off-screen walls
    wallsRef.current = wallsRef.current.filter(
      (wall) => wall.x + wall.width > 0,
    );

    // Collision detection

    if (
      isCollision({
        ballX: BALL_RADIUS * 5,
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

    // Draw the frame
    draw(ctx, ballY, wallsRef.current);

    // Request the next frame
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
