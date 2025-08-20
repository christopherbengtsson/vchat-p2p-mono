import { BASE_PLAYER_SIZE_PERCENT } from '../model/constants';
import { Pipe } from '../model/Pipe';
import { ScaleFactor } from '../model/DrawProps';
import { CanvasUtil } from '../util/CanvasUtil';
import { CanvasPipeService } from './CanvasPipeService';

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

  // Broad-phase: Only check pipes that are close to the player (optimized for performance)
  const relevantPipes = [];
  const playerLeft = roundedPlayerX - playerSize;
  const playerRight = roundedPlayerX + playerSize * 2;

  for (const pipe of pipes) {
    const pipeX = pipe.x;
    const pipeRight = pipeX + pipe.width;

    // Skip pipes that are clearly out of range without expensive Math.round calls
    if (pipeRight >= playerLeft && pipeX <= playerRight) {
      relevantPipes.push(pipe);
    }
  }

  // Narrow-phase: Check actual collisions
  for (const pipe of relevantPipes) {
    const roundedPipeX = Math.round(pipe.x);
    const roundedPipeY = Math.round(pipe.y);

    const { capWidth, capHeight, bodyWidth, bodyXOffset, bodyHeight } =
      CanvasPipeService.getPipeDimensions(pipe);

    if (pipe.isUpperPipe) {
      // Upper Pipe (Bottom Cap)
      const capZone = {
        x: roundedPipeX,
        y: roundedPipeY + bodyHeight,
        width: capWidth,
        height: capHeight,
      };

      const bodyZone = {
        x: roundedPipeX + bodyXOffset,
        y: roundedPipeY,
        width: bodyWidth,
        height: bodyHeight,
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
      const capZone = {
        x: roundedPipeX,
        y: roundedPipeY,
        width: capWidth,
        height: capHeight,
      };

      const bodyZone = {
        x: roundedPipeX + bodyXOffset,
        y: roundedPipeY + capHeight,
        width: bodyWidth,
        height: bodyHeight,
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
