import { ASSETS } from '../model/constants';
import { ScaleFactor } from '../model/DrawProps';
import { getOrCreateCachedCanvas } from '../util/CanvasUtils';
import { CanvasCacheService } from './CanvasCacheService';

// Scrolling state
let backgroundPosition = 0;

const drawBackground = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scaleFactor: ScaleFactor,
  speed: number,
) => {
  const tilesImage = ASSETS.TILES;
  const skyCoords = ASSETS.COORDS.SKY;

  // Fallback if image isn't loaded
  if (!tilesImage.complete) {
    ctx.fillStyle = '#87CEEB'; // Sky blue
    ctx.fillRect(0, 0, width, height);
    return;
  }

  // Calculate dimensions
  const aspectRatio = skyCoords.width / skyCoords.height;
  const scaledWidth = height * aspectRatio;
  const cacheKey = `sky_${height.toFixed(0)}_${scaleFactor.devicePixelRatio}`;

  // Dimensions for cache lookup/creation (use potentially float values for accuracy)
  const cacheDimensions = {
    width: scaledWidth * scaleFactor.devicePixelRatio,
    height: height * scaleFactor.devicePixelRatio,
  };
  // Dimensions for drawing onto the cache (rounded)
  const drawDimensions = {
    width: Math.round(scaledWidth),
    height: Math.round(height),
  };

  // Get or create cached background
  const cachedBackground = getOrCreateCachedCanvas(
    CanvasCacheService.caches.background,
    cacheKey,
    cacheDimensions, // Use precise dimensions for cache canvas size
    (canvas) => {
      const cacheCtx = canvas.getContext('2d');
      if (!cacheCtx) return;

      // Scale context based on devicePixelRatio for high-res displays
      cacheCtx.scale(
        scaleFactor.devicePixelRatio,
        scaleFactor.devicePixelRatio,
      );

      // Draw onto the cache using rounded dimensions for sharpness
      cacheCtx.drawImage(
        tilesImage,
        skyCoords.x,
        skyCoords.y,
        skyCoords.width,
        skyCoords.height,
        0,
        0,
        drawDimensions.width, // Use rounded width for drawing
        drawDimensions.height, // Use rounded height for drawing
      );
    },
  );

  // Update scrolling position
  const roundedScaledWidth = Math.round(scaledWidth); // Use rounded width for scroll calculation
  backgroundPosition = (backgroundPosition + speed) % roundedScaledWidth;

  // Draw tiled background with scrolling
  const numTiles = Math.ceil(width / roundedScaledWidth) + 1;
  for (let i = 0; i < numTiles; i++) {
    const x = Math.round(i * roundedScaledWidth - backgroundPosition);
    // Draw using the cache, scaling it back down to the logical size
    ctx.drawImage(
      cachedBackground,
      0,
      0,
      cachedBackground.width, // Source width from cache
      cachedBackground.height, // Source height from cache
      x, // Rounded position on main canvas
      0,
      roundedScaledWidth, // Draw width on main canvas (rounded)
      Math.round(height), // Draw height on main canvas (rounded)
    );
  }
};

export const CanvasBackgroundService = {
  drawBackground,
};
