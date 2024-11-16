import { BALL_RADIUS } from '../model/CanvasConstants';
import { Wall } from '../model/Wall';

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

export const CanvasCollisionService = {
  isCollision,
};
