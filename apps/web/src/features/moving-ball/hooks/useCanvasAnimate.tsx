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
  WALL_WIDTH,
  BALL_X_POS_MULTIPLIER,
} from '../service/CanvasService';
import { DrawProps } from '../model/DrawProps';

// Helper function to clamp a value between min and max
const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

// Circle-Rectangle collision detection
const isCircleRectCollision = (
  circleX: number,
  circleY: number,
  radius: number,
  rectX: number,
  rectY: number,
  rectWidth: number,
  rectHeight: number,
): boolean => {
  // Find the closest point to the circle within the rectangle
  const closestX = clamp(circleX, rectX, rectX + rectWidth);
  const closestY = clamp(circleY, rectY, rectY + rectHeight);

  // Calculate the distance between the circle's center and this closest point
  const distanceX = circleX - closestX;
  const distanceY = circleY - closestY;

  // If the distance is less than the circle's radius, a collision occurs
  const distanceSquared = distanceX * distanceX + distanceY * distanceY;

  return distanceSquared < radius * radius;
};

const isCollision = ({
  ballX,
  ballY,
  walls,
}: {
  walls: Wall[];
  ballX: number;
  ballY: number;
}): boolean =>
  walls.some((wall) => {
    return isCircleRectCollision(
      ballX,
      ballY,
      BALL_RADIUS,
      wall.x,
      wall.y,
      wall.width,
      wall.height,
    );
  });

interface In {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  draw: (drawProps: DrawProps) => void;
}

export const useCanvasAnimate = ({ canvasRef, draw }: In) => {
  const requestRef = useRef<number>();
  const wallsRef = useRef<Wall[]>([]);
  const wallsPassedRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);

  // Add refs for ball position and velocity
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

    // Update walls
    frameCountRef.current++;
    if (frameCountRef.current % WALL_FREQUENCY === 0) {
      // Determine the position of the gap between the top and bottom walls
      const minGapY = BALL_RADIUS;
      const maxGapY = canvas.height - WALL_GAP - BALL_RADIUS; // Maximum gap from top
      const gapY = Math.random() * (maxGapY - minGapY) + minGapY;

      // Top wall
      wallsRef.current.push({
        x: canvas.width,
        y: 0,
        width: WALL_WIDTH,
        height: gapY,
        passed: false,
        isUpperWall: true,
      });

      // Bottom wall
      wallsRef.current.push({
        x: canvas.width,
        y: gapY + WALL_GAP,
        width: WALL_WIDTH,
        height: canvas.height - (gapY + WALL_GAP),
        passed: false,
        isUpperWall: false,
      });
    }

    // Move walls
    wallsRef.current.forEach((wall) => {
      wall.x -= WALL_SPEED;

      // Check if the wall has passed the ball and hasn't been counted yet
      const ballX = BALL_RADIUS * BALL_X_POS_MULTIPLIER; // The ball's x-position
      if (
        !wall.passed &&
        wall.isUpperWall &&
        wall.x + wall.width < ballX - BALL_RADIUS
      ) {
        wall.passed = true; // Mark wall as passed
        wallsPassedRef.current += 1; // Increment the count
        console.log('Walls passed:', wallsPassedRef.current); // Optional: Log the count
      }
    });

    // Remove off-screen walls
    wallsRef.current = wallsRef.current.filter(
      (wall) => wall.x + wall.width > 0,
    );

    // Collision detection
    if (
      isCollision({
        ballX: BALL_RADIUS * BALL_X_POS_MULTIPLIER,
        ballY: ballYRef.current,
        walls: wallsRef.current,
      })
    ) {
      endGame();
      return;
    }

    draw({
      ctx,
      yPos: ballYRef.current,
      walls: wallsRef.current,
      score: wallsPassedRef.current,
    });

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
