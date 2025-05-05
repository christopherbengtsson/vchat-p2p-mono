import { CanvasUtil } from '../util/CanvasUtil';
import type { DrawProps } from '../model/DrawProps';
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

const drawCanvas = ({
  ctx,
  xPos,
  yPos,
  pipes,
  score,
  scaleFactor,
  velocity,
  pipeSpeed,
  frameCount,
  isDead = false,
  deathFrames = 0,
}: DrawProps) => {
  const canvas = ctx.canvas;

  const logicalWidth = canvas.width / scaleFactor.devicePixelRatio;
  const logicalHeight = canvas.height / scaleFactor.devicePixelRatio;

  // Setup rendering context for the main canvas
  CanvasUtil.disableImageSmoothing(ctx);
  // Clear the entire canvas based on its actual pixel dimensions
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw game elements in correct order (background to foreground)
  const backgroundSpeed = isDead ? 0 : pipeSpeed * BACKGROUND_SPEED_MULTIPLIER;

  CanvasBackgroundService.drawBackground(
    ctx,
    logicalWidth,
    logicalHeight,
    scaleFactor,
    backgroundSpeed,
  );

  CanvasCloudService.generateClouds(logicalWidth, logicalHeight, scaleFactor);

  if (!isDead) {
    CanvasCloudService.updateClouds(
      logicalWidth,
      logicalHeight,
      frameCount,
      pipeSpeed,
      scaleFactor,
    );
  }

  CanvasCloudService.drawClouds(ctx, scaleFactor);

  CanvasPipeService.drawPipes(ctx, pipes, scaleFactor);

  CanvasScoreService.drawScore(ctx, score, scaleFactor);

  const playerSizePercent = CanvasUtil.getScaledValue(
    BASE_PLAYER_SIZE_PERCENT,
    scaleFactor,
  );
  const playerWidth = logicalWidth * playerSizePercent;

  const playerX =
    xPos !== undefined ? xPos : logicalWidth * PLAYER_X_POS_MULTIPLIER;

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
};

const clearCache = () => {
  CanvasCacheService.clearCache();
  CanvasCloudService.resetClouds();
};

export const CanvasDrawService = {
  drawCanvas,
  clearCache,
};
