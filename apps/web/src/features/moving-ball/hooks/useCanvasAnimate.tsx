import { useEffect, useRef, useCallback } from 'react';
import { AudioAnalyserService } from '../service/AudioAnalyserService';
import { Wall } from '../model/Wall';
import {
  ACCELERATION,
  BALL_RADIUS,
  GRAVITY,
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
  const previousVolumeRef = useRef<number>(0);
  const wallsRef = useRef<Wall[]>([]);
  const frameCountRef = useRef<number>(0);

  const velocityRef = useRef<number>(0);
  const positionRef = useRef<number>(0);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const minY = BALL_RADIUS;
    const maxY = canvas.height - BALL_RADIUS;

    // Update volume
    const newVolume = AudioAnalyserService.getVolume();
    previousVolumeRef.current = newVolume;

    // Map volume to an upward force
    const upwardForce = newVolume * ACCELERATION; // Adjust multiplier as needed

    // Update physics
    velocityRef.current += GRAVITY; // Gravity pulls the ball down
    velocityRef.current -= upwardForce; // Voice volume pushes the ball up
    positionRef.current += velocityRef.current;

    // Clamp position within canvas bounds
    if (positionRef.current > maxY) {
      positionRef.current = maxY;
      velocityRef.current = 0; // Reset velocity upon hitting the bottom
    }
    if (positionRef.current < minY) {
      positionRef.current = minY;
      velocityRef.current = 0; // Reset velocity upon hitting the top
    }

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
    const ballX = BALL_RADIUS * 5;
    const ballY = positionRef.current;

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

    draw(ctx, positionRef.current, wallsRef.current);

    requestRef.current = requestAnimationFrame(animate);
  }, [canvasRef, draw]);

  useEffect(() => {
    // Initialize position at the bottom of the canvas
    const canvas = canvasRef.current;
    if (canvas) {
      positionRef.current = canvas.height - BALL_RADIUS;
    }
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [animate, canvasRef]);
};
