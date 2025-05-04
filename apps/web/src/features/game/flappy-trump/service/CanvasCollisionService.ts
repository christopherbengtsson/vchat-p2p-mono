import { BASE_PLAYER_SIZE_PERCENT, ASSETS } from '../model/constants';
import { Pipe } from '../model/Pipe';
import { ScaleFactor } from '../model/DrawProps';
import { CanvasUtil } from '../util/CanvasUtil';

// TODO: Should probably detect collision more carefully since we're not using a true square

interface CollisionParams {
  playerX: number;
  playerY: number;
  playerWidth: number;
  playerHeight: number;
  pipes: Pipe[];
  canvasWidth: number;
  scaleFactor: ScaleFactor;
}

const isCollision = ({
  playerX,
  playerY,
  playerWidth,
  playerHeight,
  pipes,
  canvasWidth,
  scaleFactor,
}: CollisionParams) => {
  const roundedPlayerX = Math.round(playerX);
  const roundedPlayerY = Math.round(playerY);

  let playerSize;
  if (playerWidth) {
    playerSize = playerWidth;
  } else if (scaleFactor) {
    const playerSizePercent = CanvasUtil.getScaledValue(
      BASE_PLAYER_SIZE_PERCENT,
      scaleFactor,
    );
    playerSize = canvasWidth * playerSizePercent;
  } else {
    playerSize = canvasWidth * BASE_PLAYER_SIZE_PERCENT;
  }

  const playerHitbox = {
    x: roundedPlayerX,
    y: roundedPlayerY,
    width: playerSize,
    height: playerHeight || playerSize,
  };

  // Broad-phase: Only check pipes that are close to the player
  const relevantPipes = pipes.filter((pipe) => {
    const roundedPipeX = Math.round(pipe.x);
    // Only check pipes that are within a reasonable range
    // Use pipe.width (max width) for broad phase check
    return (
      roundedPipeX + pipe.width >= roundedPlayerX - playerSize &&
      roundedPipeX <= roundedPlayerX + playerSize * 2
    );
  });

  // Narrow-phase: Check actual collisions
  for (const pipe of relevantPipes) {
    const roundedPipeX = Math.round(pipe.x);
    const roundedPipeY = Math.round(pipe.y);

    const roundedPipeWidth = Math.round(pipe.width);
    const roundedPipeHeight = Math.round(pipe.height);

    // --- Calculate Cap and Body Dimensions ---
    const pipeCoords = ASSETS.COORDS.PIPE;
    let capCoords, capHeight, middleWidth, xOffset;

    if (pipe.isUpperPipe) {
      // Upper Pipe (Bottom Cap)
      capCoords = ASSETS.COORDS.PIPE_BOTTOM;
      const pipeWidthRatio = roundedPipeWidth / capCoords.width;
      capHeight = Math.round(capCoords.height * pipeWidthRatio);
      const middleWidthRatio = pipeCoords.width / capCoords.width;
      middleWidth = Math.round(roundedPipeWidth * middleWidthRatio);
      xOffset = Math.round((roundedPipeWidth - middleWidth) / 2);

      const capZone = {
        x: roundedPipeX,
        y: roundedPipeY + roundedPipeHeight - capHeight,
        width: roundedPipeWidth,
        height: capHeight,
      };

      const bodyZone = {
        x: roundedPipeX + xOffset, // Body is narrower and offset
        y: roundedPipeY,
        width: middleWidth, // Body uses narrow width
        height: roundedPipeHeight - capHeight,
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
      const pipeWidthRatio = roundedPipeWidth / capCoords.width;
      capHeight = Math.round(capCoords.height * pipeWidthRatio);
      const middleWidthRatio = pipeCoords.width / capCoords.width;
      middleWidth = Math.round(roundedPipeWidth * middleWidthRatio);
      xOffset = Math.round((roundedPipeWidth - middleWidth) / 2);

      const capZone = {
        x: roundedPipeX,
        y: roundedPipeY,
        width: roundedPipeWidth, // Cap uses full width
        height: capHeight,
      };

      const bodyZone = {
        x: roundedPipeX + xOffset, // Body is narrower and offset
        y: roundedPipeY + capHeight,
        width: middleWidth, // Body uses narrow width
        height: roundedPipeHeight - capHeight,
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
