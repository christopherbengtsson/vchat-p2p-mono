import {
  DIFFICULTY,
  PLAYER_X_POS_MULTIPLIER,
  WALL_FREQUENCY,
  WALL_GAP_MULTIPLIER,
  BASE_WALL_WIDTH_PERCENT,
  PLAYER_WIDTH_PERCENT,
} from '../model/CanvasConstants';
import { ScaleFactor } from '../model/DrawProps';
import { Wall } from '../model/Wall';

const getScaledValue = (
  baseValue: number,
  scaleFactor: ScaleFactor,
): number => {
  const deviceScaling = scaleFactor.deviceScaleFactor || 1;
  return baseValue * deviceScaling;
};

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

    // Apply device-specific scaling to wall width
    const wallWidthPercent = getScaledValue(
      BASE_WALL_WIDTH_PERCENT,
      scaleFactor,
    );
    const wallWidth = canvasWidth * wallWidthPercent;

    // Apply device-specific scaling to player height
    const playerWidthPercent = getScaledValue(
      PLAYER_WIDTH_PERCENT,
      scaleFactor,
    );

    const playerWidth =
      (canvas.width / scaleFactor.devicePixelRatio) * playerWidthPercent;

    const wallGap = playerWidth * WALL_GAP_MULTIPLIER;

    // Ensure minimum gap position accounts for player height
    const minGapY = playerWidth;
    const maxGapY = canvasHeight - wallGap - playerWidth;

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
  getScaledValue,
};
