import { CanvasUtil } from '../util/CanvasUtil';
import type { DrawProps } from '../model/DrawProps';
import {
  BACKGROUND_SPEED_MULTIPLIER,
  BASE_PLAYER_SIZE_PERCENT,
  PLAYER_X_POS_MULTIPLIER,
  ASSETS,
} from '../model/constants';
import { CanvasCacheService } from './CanvasCacheService';
import { CanvasBackgroundService } from './CanvasBackgroundService';
import { CanvasCloudService } from './CanvasCloudService';
import { CanvasPipeService } from './CanvasPipeService';
import { CanvasPlayerService } from './CanvasPlayerService';
import { CanvasHeartService } from './CanvasHeartService';

const areAssetsReady = () => ASSETS.TILES.complete;

/**
 * Main canvas drawing function that orchestrates all rendering operations
 */
const drawCanvas = ({
  ctx,
  xPos,
  yPos,
  scaleFactor,
  velocity,
  pipeSpeed,
  frameCount,
  deltaTime,
  isDead = false,
  deathFrames = 0,
  playerSize,
}: DrawProps) => {
  // Skip rendering if assets aren't loaded
  if (!areAssetsReady()) return;

  const canvas = ctx.canvas;

  const logicalWidth = canvas.width / scaleFactor.devicePixelRatio;
  const logicalHeight = canvas.height / scaleFactor.devicePixelRatio;

  // Setup rendering context for the main canvas
  CanvasUtil.disableImageSmoothing(ctx);
  // Clear the entire canvas based on its actual pixel dimensions
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw game elements in correct order (background to foreground)
  const backgroundSpeed = isDead ? 0 : pipeSpeed * BACKGROUND_SPEED_MULTIPLIER;

  // Draw background
  CanvasBackgroundService.drawBackground(
    ctx,
    logicalWidth,
    logicalHeight,
    scaleFactor,
    backgroundSpeed,
    deltaTime,
  );

  // Generate and update clouds
  CanvasCloudService.generateClouds(logicalWidth, logicalHeight, scaleFactor);

  if (!isDead) {
    CanvasCloudService.updateClouds(
      logicalWidth,
      logicalHeight,
      frameCount,
      pipeSpeed,
      scaleFactor,
      deltaTime,
    );
  }

  // Draw clouds
  CanvasCloudService.drawClouds(ctx, scaleFactor);

  // Draw pipes
  CanvasPipeService.drawPipes(ctx, scaleFactor);

  // Use pre-calculated player dimensions
  const playerWidth =
    playerSize ||
    logicalWidth *
      CanvasUtil.getScaledValue(BASE_PLAYER_SIZE_PERCENT, scaleFactor);

  // Calculate player position
  const playerX =
    xPos !== undefined ? xPos : logicalWidth * PLAYER_X_POS_MULTIPLIER;

  // Draw player
  CanvasPlayerService.drawPlayer(
    ctx,
    playerX,
    yPos,
    playerWidth,
    velocity,
    scaleFactor,
    isDead,
    deathFrames,
  );

  // Draw hearts animation
  if (!isDead) {
    // Use pre-calculated player height to avoid recalculating aspect ratio
    const playerCoords = ASSETS.COORDS.TRUMP;
    const aspectRatio = playerCoords.width / playerCoords.height;
    const playerHeight = playerWidth / aspectRatio;

    CanvasHeartService.drawHearts(
      ctx,
      playerX,
      yPos,
      playerWidth,
      playerHeight,
      scaleFactor,
    );
  }
};

const clearCache = () => {
  CanvasCacheService.clearCache();
  CanvasCloudService.resetClouds();
  CanvasBackgroundService.resetBackground();
  CanvasHeartService.resetHeartAnimation();
};

export const CanvasDrawService = {
  drawCanvas,
  clearCache,
  areAssetsReady,
};
