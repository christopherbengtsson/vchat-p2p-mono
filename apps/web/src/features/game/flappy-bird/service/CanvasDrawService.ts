import { CanvasUtil } from '../util/CanvasUtil';
import { DrawProps } from '../model/DrawProps';
import {
  BACKGROUND_SPEED_MULTIPLIER,
  BASE_PLAYER_SIZE_PERCENT,
  PLAYER_X_POS_MULTIPLIER,
} from '../model/constants';
import { CanvasCacheService } from './CanvasCacheService';
import { CanvasBackgroundService } from './CanvasBackgroundService';
import { CanvasCloudService } from './CanvasCloudService';
import { CanvasPipeService } from './CanvasPipeService';
import { CanvasScoreService } from './CanvasScoreService';
import { CanvasPlayerService } from './CanvasPlayerService';

// Main drawing function
const drawCanvas = ({
  ctx,
  yPos,
  pipes,
  score,
  scaleFactor,
  velocity,
  pipeSpeed,
  frameCount,
}: DrawProps) => {
  const canvas = ctx.canvas;
  // Calculate logical width/height based on DPR
  const logicalWidth = canvas.width / scaleFactor.devicePixelRatio;
  const logicalHeight = canvas.height / scaleFactor.devicePixelRatio;

  // Setup rendering context for the main canvas
  CanvasUtil.disableImageSmoothing(ctx);
  // Clear the entire canvas based on its actual pixel dimensions
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw game elements in correct order (background to foreground)
  const backgroundSpeed = pipeSpeed * BACKGROUND_SPEED_MULTIPLIER;
  // Pass logical width/height to drawing functions
  CanvasBackgroundService.drawBackground(
    ctx,
    logicalWidth,
    logicalHeight,
    scaleFactor,
    backgroundSpeed,
  );

  CanvasCloudService.generateClouds(logicalWidth, logicalHeight, scaleFactor);
  CanvasCloudService.updateClouds(
    logicalWidth,
    logicalHeight,
    frameCount,
    pipeSpeed,
    scaleFactor,
  );
  CanvasCloudService.drawClouds(ctx, scaleFactor);

  CanvasPipeService.drawPipes(ctx, pipes, scaleFactor);

  CanvasScoreService.drawScore(ctx, score, scaleFactor);

  // Calculate player dimensions in logical space with device-specific scaling
  const playerSizePercent = CanvasUtil.getScaledValue(
    BASE_PLAYER_SIZE_PERCENT,
    scaleFactor,
  );
  const playerWidth = logicalWidth * playerSizePercent;
  const playerX = logicalWidth * PLAYER_X_POS_MULTIPLIER;

  // yPos is already in logical space
  CanvasPlayerService.drawPlayer(
    ctx,
    playerX,
    yPos,
    playerWidth,
    velocity,
    scaleFactor,
  );
};

const clearCache = () => {
  CanvasCacheService.clearCache();
  CanvasCloudService.resetClouds();
};

export const CanvasDrawService = {
  drawCanvas,
  clearCache,
};
