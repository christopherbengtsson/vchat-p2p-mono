import { PLAYER_WIDTH_PERCENT } from '../model/CanvasConstants';
import { Wall } from '../model/Wall';

const isRectCollision = (
  rect1X: number,
  rect1Y: number,
  rectSize: number,
  rect2X: number,
  rect2Y: number,
  rect2Width: number,
  rect2Height: number,
): boolean => {
  return (
    rect1X < rect2X + rect2Width &&
    rect1X + rectSize > rect2X &&
    rect1Y < rect2Y + rect2Height &&
    rect1Y + rectSize > rect2Y
  );
};

const isCollision = ({
  playerX,
  playerY,
  walls,
  canvasWidth,
}: {
  walls: Wall[];
  playerX: number;
  playerY: number;
  canvasWidth: number;
}): boolean => {
  // Use only width for both dimensions to maintain square shape
  const playerSize = canvasWidth * PLAYER_WIDTH_PERCENT;

  return walls.some((wall) =>
    isRectCollision(
      playerX,
      playerY,
      playerSize,
      wall.x,
      wall.y,
      wall.width,
      wall.height,
    ),
  );
};

export const CanvasCollisionService = {
  isCollision,
};
