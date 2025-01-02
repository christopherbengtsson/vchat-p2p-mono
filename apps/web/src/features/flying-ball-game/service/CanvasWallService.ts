import {
  PLANE_HEIGHT,
  PLANE_WIDTH,
  PLANE_X_POS_MULTIPLIER,
  WALL_FREQUENCY,
  WALL_GAP,
  WALL_SPEED,
  WALL_WIDTH,
} from '../model/CanvasConstants';
import { Wall } from '../model/Wall';

const addWall = (
  frameCountRef: React.MutableRefObject<number>,
  wallsRef: React.MutableRefObject<Wall[]>,
  canvas: HTMLCanvasElement,
) => {
  frameCountRef.current++;
  if (frameCountRef.current % WALL_FREQUENCY === 0) {
    // Adjust gap position considering plane height
    const minGapY = PLANE_HEIGHT;
    const maxGapY = canvas.height - WALL_GAP - PLANE_HEIGHT;
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
};

const moveWalls = (
  wallsRef: React.MutableRefObject<Wall[]>,
  wallsPassedRef: React.MutableRefObject<number>,
) => {
  wallsRef.current.forEach((wall) => {
    wall.x -= WALL_SPEED;

    // Check if wall has passed the plane
    const planeX = PLANE_WIDTH * PLANE_X_POS_MULTIPLIER;
    if (
      !wall.passed &&
      wall.isUpperWall && // Otherwise wallsPassed would be increased by 2
      wall.x + wall.width < planeX
    ) {
      wall.passed = true;
      wallsPassedRef.current += 1;
    }
  });
};

const removeWalls = (wallsRef: React.MutableRefObject<Wall[]>) => {
  wallsRef.current = wallsRef.current.filter((wall) => wall.x + wall.width > 0);
};

export const CanvasWallService = {
  addWall,
  moveWalls,
  removeWalls,
};
