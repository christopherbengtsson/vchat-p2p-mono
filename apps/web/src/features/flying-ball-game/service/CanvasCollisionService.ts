import { PLANE_HEIGHT, PLANE_WIDTH } from '../model/CanvasConstants';
import { Wall } from '../model/Wall';

const isRectCollision = (
  rect1X: number,
  rect1Y: number,
  rect1Width: number,
  rect1Height: number,
  rect2X: number,
  rect2Y: number,
  rect2Width: number,
  rect2Height: number,
): boolean => {
  return (
    rect1X < rect2X + rect2Width &&
    rect1X + rect1Width > rect2X &&
    rect1Y < rect2Y + rect2Height &&
    rect1Y + rect1Height > rect2Y
  );
};

const isCollision = ({
  planeX,
  planeY,
  walls,
}: {
  walls: Wall[];
  planeX: number;
  planeY: number;
}): boolean =>
  walls.some((wall) =>
    isRectCollision(
      planeX,
      planeY,
      PLANE_WIDTH,
      PLANE_HEIGHT,
      wall.x,
      wall.y,
      wall.width,
      wall.height,
    ),
  );

export const CanvasCollisionService = {
  isCollision,
};
