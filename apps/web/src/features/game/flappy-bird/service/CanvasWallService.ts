import {
  DIFFICULTY,
  PLAYER_HEIGHT_PERCENT,
  PLAYER_X_POS_MULTIPLIER,
  WALL_FREQUENCY,
  WALL_GAP_PERCENT,
  WALL_WIDTH_PERCENT,
} from '../model/CanvasConstants';
import { ScaleFactor } from '../model/DrawProps';
import { Wall } from '../model/Wall';

const addWall = (
  frameCountRef: React.RefObject<number>,
  wallsRef: React.RefObject<Wall[]>,
  canvas: HTMLCanvasElement,
  scaleFactor: ScaleFactor,
  scoreRef: React.RefObject<number>,
) => {
  frameCountRef.current++;

  // Adjust wall frequency based on progress
  const actualFrequency = Math.max(
    WALL_FREQUENCY - Math.floor(scoreRef.current / 5) * 5,
    60, // Don't go below 60 (too fast)
  );

  if (frameCountRef.current % actualFrequency === 0) {
    const canvasWidth = canvas.width / scaleFactor.devicePixelRatio;
    const canvasHeight = canvas.height / scaleFactor.devicePixelRatio;

    // Calculate wall dimensions based on percentages
    const wallWidth = canvasWidth * WALL_WIDTH_PERCENT;
    const wallGap = canvasHeight * WALL_GAP_PERCENT;

    // Adjust gap position considering player height
    const playerHeight = canvasHeight * PLAYER_HEIGHT_PERCENT;
    const minGapY = playerHeight;
    const maxGapY = canvasHeight - wallGap - playerHeight;
    const gapY = Math.random() * (maxGapY - minGapY) + minGapY;

    // Top wall
    wallsRef.current.push({
      x: canvasWidth,
      y: 0,
      width: wallWidth,
      height: gapY,
      passed: false,
      isUpperWall: true,
    });

    // Bottom wall
    wallsRef.current.push({
      x: canvasWidth,
      y: gapY + wallGap,
      width: wallWidth,
      height: canvasHeight - (gapY + wallGap),
      passed: false,
      isUpperWall: false,
    });
  }
};

// Memoize speed calculation to avoid recalculating it for every wall
const moveWalls = (
  wallsRef: React.RefObject<Wall[]>,
  wallsPassedRef: React.RefObject<number>,
  scaleFactor: ScaleFactor,
  canvasWidth: number,
) => {
  // Calculate speed based on score (increasing difficulty) - do only once
  const speed =
    Math.min(
      DIFFICULTY.INITIAL_SPEED +
        wallsPassedRef.current * DIFFICULTY.SPEED_INCREMENT,
      DIFFICULTY.MAX_SPEED,
    ) * scaleFactor.widthScale;

  // Calculate player position - do only once
  const playerX = canvasWidth * PLAYER_X_POS_MULTIPLIER;

  // Process all walls at once with one loop
  for (let i = 0; i < wallsRef.current.length; i++) {
    const wall = wallsRef.current[i];
    wall.x -= speed;

    // Check if wall has passed the player - only count upper walls to avoid double counting
    if (
      !wall.passed &&
      wall.isUpperWall && // Count score only once per pipe pair
      wall.x + wall.width < playerX
    ) {
      wall.passed = true;
      wallsPassedRef.current += 1;
    }
  }
};

const removeWalls = (wallsRef: React.RefObject<Wall[]>) => {
  wallsRef.current = wallsRef.current.filter((wall) => wall.x + wall.width > 0);
};

const getWallSpeed = (
  wallsPassedRef: React.RefObject<number>,
  scaleFactor: ScaleFactor,
) =>
  Math.min(
    DIFFICULTY.INITIAL_SPEED +
      wallsPassedRef.current * DIFFICULTY.SPEED_INCREMENT,
    DIFFICULTY.MAX_SPEED,
  ) * scaleFactor.widthScale;

export const CanvasWallService = {
  addWall,
  moveWalls,
  removeWalls,
  getWallSpeed,
};
