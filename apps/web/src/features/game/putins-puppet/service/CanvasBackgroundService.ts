import { ASSETS } from '../model/constants';
import { ScaleFactor } from '../model/DrawProps';
import { CanvasUtil } from '../util/CanvasUtil';
import { CanvasCacheService, MAX_CACHE_SIZE } from './CanvasCacheService';

// Scrolling state
let backgroundPosition = 0;

/**
 * Draws the scrolling background
 */
const drawBackground = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scaleFactor: ScaleFactor,
  speed: number,
  deltaTime: number,
) => {
  const tilesImage = ASSETS.TILES;
  if (!tilesImage.complete) return;

  const skyCoords = ASSETS.COORDS.SKY;

  const aspectRatio = skyCoords.width / skyCoords.height;
  const scaledWidth = height * aspectRatio;
  const cacheKey = `sky_${height.toFixed(0)}_${scaleFactor.devicePixelRatio}`;

  const cacheDimensions = {
    width: scaledWidth * scaleFactor.devicePixelRatio,
    height: height * scaleFactor.devicePixelRatio,
  };

  const drawDimensions = {
    width: Math.round(scaledWidth),
    height: Math.round(height),
  };

  const cachedBackground = CanvasUtil.getOrCreateCachedCanvas(
    CanvasCacheService.caches.background,
    cacheKey,
    cacheDimensions,
    (canvas) => {
      const cacheCtx = canvas.getContext('2d');
      if (!cacheCtx) return;

      cacheCtx.scale(
        scaleFactor.devicePixelRatio,
        scaleFactor.devicePixelRatio,
      );

      cacheCtx.drawImage(
        tilesImage,
        skyCoords.x,
        skyCoords.y,
        skyCoords.width,
        skyCoords.height,
        0,
        0,
        drawDimensions.width,
        drawDimensions.height,
      );
    },
    MAX_CACHE_SIZE.BACKGROUND,
  );

  // Update scrolling position (frame-rate independent)
  const roundedScaledWidth = Math.round(scaledWidth);
  backgroundPosition =
    (backgroundPosition + speed * deltaTime) % roundedScaledWidth;

  // Draw repeating background tiles
  const numTiles = Math.ceil(width / roundedScaledWidth) + 1;
  for (let i = 0; i < numTiles; i++) {
    const x = Math.round(i * roundedScaledWidth - backgroundPosition);

    ctx.drawImage(
      cachedBackground,
      0,
      0,
      cachedBackground.width,
      cachedBackground.height,
      x,
      0,
      roundedScaledWidth,
      Math.round(height),
    );
  }
};

const resetBackground = () => {
  backgroundPosition = 0;
};

export const CanvasBackgroundService = {
  drawBackground,
  resetBackground,
};
