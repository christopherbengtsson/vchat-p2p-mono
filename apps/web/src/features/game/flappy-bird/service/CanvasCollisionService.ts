import { PLAYER_WIDTH_PERCENT } from '../model/CanvasConstants';
import { Wall } from '../model/Wall';

interface CollisionParams {
  playerX: number;
  playerY: number;
  walls: Wall[];
  canvasWidth: number;
}

const isCollision = ({
  playerX,
  playerY,
  walls,
  canvasWidth,
}: CollisionParams) => {
  // Round player position to match visual rendering
  const roundedPlayerX = Math.round(playerX);
  const roundedPlayerY = Math.round(playerY);

  // Calculate player size based on canvas width
  const playerSize = canvasWidth * PLAYER_WIDTH_PERCENT;

  // Define player hitbox - using exact size
  const playerHitbox = {
    x: roundedPlayerX,
    y: roundedPlayerY,
    width: playerSize,
    height: playerSize,
  };

  // Broad-phase: Only check walls that are close to the player
  const relevantWalls = walls.filter((wall) => {
    // Round wall position to match visual rendering
    const roundedWallX = Math.round(wall.x);

    // Only check walls that are within a reasonable range
    return (
      roundedWallX + wall.width >= roundedPlayerX - playerSize &&
      roundedWallX <= roundedPlayerX + playerSize * 2
    );
  });

  // Narrow-phase: Check actual collisions
  for (const wall of relevantWalls) {
    // Round wall position to match visual rendering
    const roundedWallX = Math.round(wall.x);
    const roundedWallY = Math.round(wall.y);

    // Axis-Aligned Bounding Box collision detection with rounded positions
    if (
      playerHitbox.x < roundedWallX + wall.width &&
      playerHitbox.x + playerHitbox.width > roundedWallX &&
      playerHitbox.y < roundedWallY + wall.height &&
      playerHitbox.y + playerHitbox.height > roundedWallY
    ) {
      return true;
    }
  }

  return false;
};

export const CanvasCollisionService = {
  isCollision,
};
