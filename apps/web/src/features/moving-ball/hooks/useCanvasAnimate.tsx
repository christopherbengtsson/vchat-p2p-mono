import { useEffect, useRef, useCallback } from 'react';
import { AudioAnalyserService } from '../service/AudioAnalyserService';
import { Wall } from '../model/Wall';
import {
  JUMP_STRENGTH,
  BALL_RADIUS,
  GRAVITY,
  WALL_FREQUENCY,
  WALL_SPEED,
  SMOOTHING_FRAMES,
  VOLUME_THRESHOLD,
  VOLUME_SCALE,
  WALL_GAP,
} from '../service/CanvasService';

const isCollision = ({
  ballX,
  ballY,
  walls,
}: {
  walls: Wall[];
  ballX: number;
  ballY: number;
}) =>
  walls.some((wall) => {
    const inXRange =
      ballX + BALL_RADIUS > wall.x && ballX - BALL_RADIUS < wall.x + wall.width;
    const inYRange =
      ballY + BALL_RADIUS > wall.y &&
      ballY - BALL_RADIUS < wall.y + wall.height;
    return inXRange && inYRange;
  });

interface In {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  draw: (ctx: CanvasRenderingContext2D, yPos: number, walls: Wall[]) => void;
}

export const useCanvasAnimate = ({ canvasRef, draw }: In) => {
  const requestRef = useRef<number>();
  const wallsRef = useRef<Wall[]>([]);
  const frameCountRef = useRef<number>(0);

  // Add refs for ball position and velocity
  const ballYRef = useRef<number>(0);
  const velocityRef = useRef<number>(0);

  const volumeHistory = useRef<number[]>([]);

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

    // Initialize ball position on the first frame
    if (ballYRef.current === 0) {
      ballYRef.current = canvas.height / 2;
    }

    // If volume is above the threshold, the ball jumps up
    if (smoothedVolume > 0) {
      velocityRef.current = JUMP_STRENGTH * smoothedVolume;
    } else {
      // Apply gravity when volume is low
      velocityRef.current += GRAVITY;
    }

    // Update ball position based on velocity
    ballYRef.current += velocityRef.current;

    // Prevent the ball from going above the canvas
    if (ballYRef.current < BALL_RADIUS) {
      ballYRef.current = BALL_RADIUS;
      velocityRef.current = 0;
    }

    // Prevent the ball from falling below the canvas
    const maxY = canvas.height - BALL_RADIUS;
    if (ballYRef.current > maxY) {
      ballYRef.current = maxY;
      velocityRef.current = 0;
    }

    // Update walls (if necessary)
    frameCountRef.current++;
    if (frameCountRef.current % WALL_FREQUENCY === 0) {
      // Determine the position of the gap between the top and bottom walls
      const minGapY = BALL_RADIUS * 2; // Minimum gap from top
      const maxGapY = canvas.height - WALL_GAP - BALL_RADIUS * 2; // Maximum gap from top
      const gapY = Math.random() * (maxGapY - minGapY) + minGapY;

      // Top wall
      wallsRef.current.push({
        x: canvas.width,
        y: 0,
        width: 20,
        height: gapY,
      });

      // Bottom wall
      wallsRef.current.push({
        x: canvas.width,
        y: gapY + WALL_GAP,
        width: 20,
        height: canvas.height - (gapY + WALL_GAP),
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
        ballY: ballYRef.current,
        walls: wallsRef.current,
      })
    ) {
      if (requestRef.current) {
        AudioAnalyserService.stop();
        cancelAnimationFrame(requestRef.current);
        return;
      }
    }

    // Draw the frame
    draw(ctx, ballYRef.current, wallsRef.current);

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
