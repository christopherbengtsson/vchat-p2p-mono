import { BASE_PLAYER_SIZE_PERCENT, ASSETS } from '../model/CanvasConstants'; // Import ASSETS
import { Wall } from '../model/Wall';
import { ScaleFactor } from '../model/DrawProps';
import { CanvasWallService } from './CanvasWallService';

interface CollisionParams {
  playerX: number;
  playerY: number;
  playerWidth?: number; // Optional parameter for scaled player width
  playerHeight?: number; // Optional parameter for scaled player height
  walls: Wall[];
  canvasWidth: number;
  scaleFactor?: ScaleFactor; // Optional scale factor
}

const isCollision = ({
  playerX,
  playerY,
  playerWidth,
  playerHeight,
  walls,
  canvasWidth,
  scaleFactor,
}: CollisionParams) => {
  // Round player position to match visual rendering
  const roundedPlayerX = Math.round(playerX);
  const roundedPlayerY = Math.round(playerY);

  // Calculate player size based on canvas width and device scaling if available
  let playerSize;
  if (playerWidth) {
    playerSize = playerWidth; // Use provided width if available
  } else if (scaleFactor) {
    // Apply device-specific scaling
    const playerSizePercent = CanvasWallService.getScaledValue(
      BASE_PLAYER_SIZE_PERCENT,
      scaleFactor,
    );
    playerSize = canvasWidth * playerSizePercent;
  } else {
    // Fallback to base size
    playerSize = canvasWidth * BASE_PLAYER_SIZE_PERCENT;
  }

  // Define player hitbox - using exact size
  const playerHitbox = {
    x: roundedPlayerX,
    y: roundedPlayerY,
    width: playerSize,
    height: playerHeight || playerSize, // Use provided height or default to square
  };

  // Broad-phase: Only check walls that are close to the player
  const relevantWalls = walls.filter((wall) => {
    // Round wall position to match visual rendering
    const roundedWallX = Math.round(wall.x);
    // Only check walls that are within a reasonable range
    // Use wall.width (max width) for broad phase check
    return (
      roundedWallX + wall.width >= roundedPlayerX - playerSize &&
      roundedWallX <= roundedPlayerX + playerSize * 2
    );
  });

  // Narrow-phase: Check actual collisions
  for (const wall of relevantWalls) {
    // Round wall position and dimensions for consistency with rendering/cache
    const roundedWallX = Math.round(wall.x);
    const roundedWallY = Math.round(wall.y);
    // Use rounded dimensions consistent with how cache canvases are created
    const roundedWallWidth = Math.round(wall.width);
    const roundedWallHeight = Math.round(wall.height);

    // --- Calculate Cap and Body Dimensions (mirroring CanvasDrawService) ---
    const pipeCoords = ASSETS.COORDS.PIPE;
    let capCoords, capHeight, middleWidth, xOffset;

    if (wall.isUpperWall) {
      // Upper Pipe (Bottom Cap)
      capCoords = ASSETS.COORDS.PIPE_BOTTOM;
      const pipeWidthRatio = roundedWallWidth / capCoords.width;
      capHeight = Math.round(capCoords.height * pipeWidthRatio);
      const middleWidthRatio = pipeCoords.width / capCoords.width;
      middleWidth = Math.round(roundedWallWidth * middleWidthRatio);
      xOffset = Math.round((roundedWallWidth - middleWidth) / 2);

      // Define collision zones for upper pipe
      const capZone = {
        x: roundedWallX,
        y: roundedWallY + roundedWallHeight - capHeight,
        width: roundedWallWidth, // Cap uses full width
        height: capHeight,
      };

      const bodyZone = {
        x: roundedWallX + xOffset, // Body is narrower and offset
        y: roundedWallY,
        width: middleWidth, // Body uses narrow width
        height: roundedWallHeight - capHeight,
      };

      // Check collision with Cap Zone (using full width)
      if (
        playerHitbox.x < capZone.x + capZone.width &&
        playerHitbox.x + playerHitbox.width > capZone.x &&
        playerHitbox.y < capZone.y + capZone.height &&
        playerHitbox.y + playerHitbox.height > capZone.y
      ) {
        return true; // Collision with cap
      }

      // Check collision with Body Zone (using narrow width)
      if (
        playerHitbox.x < bodyZone.x + bodyZone.width &&
        playerHitbox.x + playerHitbox.width > bodyZone.x &&
        playerHitbox.y < bodyZone.y + bodyZone.height &&
        playerHitbox.y + playerHitbox.height > bodyZone.y
      ) {
        return true; // Collision with body
      }
    } else {
      // Lower Pipe (Top Cap)
      capCoords = ASSETS.COORDS.PIPE_TOP;
      const pipeWidthRatio = roundedWallWidth / capCoords.width;
      capHeight = Math.round(capCoords.height * pipeWidthRatio);
      const middleWidthRatio = pipeCoords.width / capCoords.width;
      middleWidth = Math.round(roundedWallWidth * middleWidthRatio);
      xOffset = Math.round((roundedWallWidth - middleWidth) / 2);

      // Define collision zones for lower pipe
      const capZone = {
        x: roundedWallX,
        y: roundedWallY,
        width: roundedWallWidth, // Cap uses full width
        height: capHeight,
      };

      const bodyZone = {
        x: roundedWallX + xOffset, // Body is narrower and offset
        y: roundedWallY + capHeight,
        width: middleWidth, // Body uses narrow width
        height: roundedWallHeight - capHeight,
      };

      // Check collision with Cap Zone (using full width)
      if (
        playerHitbox.x < capZone.x + capZone.width &&
        playerHitbox.x + playerHitbox.width > capZone.x &&
        playerHitbox.y < capZone.y + capZone.height &&
        playerHitbox.y + playerHitbox.height > capZone.y
      ) {
        return true; // Collision with cap
      }

      // Check collision with Body Zone (using narrow width)
      if (
        playerHitbox.x < bodyZone.x + bodyZone.width &&
        playerHitbox.x + playerHitbox.width > bodyZone.x &&
        playerHitbox.y < bodyZone.y + bodyZone.height &&
        playerHitbox.y + playerHitbox.height > bodyZone.y
      ) {
        return true; // Collision with body
      }
    }
  }

  return false; // No collision detected
};

export const CanvasCollisionService = {
  isCollision,
};
