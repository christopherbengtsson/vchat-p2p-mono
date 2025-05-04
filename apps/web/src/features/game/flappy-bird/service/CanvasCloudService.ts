import {
  ASSETS,
  CLOUD_COUNT_RANGE,
  CLOUD_FREQUENCY,
  CLOUD_OPACITY_RANGE,
  CLOUD_SCALE_RANGE,
  CLOUD_SPEED_MULTIPLIER,
  CLOUD_VERTICAL_RANGE,
  BASE_CLOUD_SIZE_PERCENT,
} from '../model/constants';
import { ScaleFactor } from '../model/DrawProps';
import { CanvasUtil } from '../util/CanvasUtil';
import { CanvasCacheService } from './CanvasCacheService';

// Cloud state
let clouds: {
  x: number;
  y: number;
  width: number;
  height: number;
  speedMultiplier: number;
  opacity: number;
  scale: number;
}[] = [];

// When generating initial clouds with device-specific scaling
const generateClouds = (
  width: number,
  height: number,
  scaleFactor: ScaleFactor,
) => {
  // Initialize clouds if empty
  if (clouds.length === 0) {
    const cloudCount = Math.floor(
      Math.random() * (CLOUD_COUNT_RANGE.MAX - CLOUD_COUNT_RANGE.MIN + 1) +
        CLOUD_COUNT_RANGE.MIN,
    );

    for (let i = 0; i < cloudCount; i++) {
      // Apply device-specific scaling to cloud size
      const cloudSizePercent = CanvasUtil.getScaledValue(
        BASE_CLOUD_SIZE_PERCENT,
        scaleFactor,
      );

      // Apply scaleFactor to cloud dimensions
      const scaleVariation =
        Math.random() * (CLOUD_SCALE_RANGE.MAX - CLOUD_SCALE_RANGE.MIN) +
        CLOUD_SCALE_RANGE.MIN;
      const baseCloudWidth = width * cloudSizePercent;
      const cloudWidth =
        baseCloudWidth * scaleVariation * scaleFactor.widthScale;

      const aspectRatio =
        ASSETS.COORDS.CLOUD.width / ASSETS.COORDS.CLOUD.height;
      const cloudHeight = cloudWidth / aspectRatio;

      // Calculate speed based on size - larger clouds move faster (appear closer)
      // Map the scale variation (0.7-1.3) to speed range (0.2-0.4)
      const normalizedScale =
        (scaleVariation - CLOUD_SCALE_RANGE.MIN) /
        (CLOUD_SCALE_RANGE.MAX - CLOUD_SCALE_RANGE.MIN);
      const speedMultiplier =
        CLOUD_SPEED_MULTIPLIER.MIN +
        normalizedScale *
          (CLOUD_SPEED_MULTIPLIER.MAX - CLOUD_SPEED_MULTIPLIER.MIN);

      clouds.push({
        x: Math.random() * width,
        y:
          height *
          (Math.random() *
            (CLOUD_VERTICAL_RANGE.MAX - CLOUD_VERTICAL_RANGE.MIN) +
            CLOUD_VERTICAL_RANGE.MIN),
        width: cloudWidth,
        height: cloudHeight,
        speedMultiplier,
        opacity:
          Math.random() * (CLOUD_OPACITY_RANGE.MAX - CLOUD_OPACITY_RANGE.MIN) +
          CLOUD_OPACITY_RANGE.MIN,
        scale: scaleVariation,
      });
    }
  }
};

// When adding new clouds with device-specific scaling
const updateClouds = (
  width: number,
  height: number,
  frameCount: number,
  pipeSpeed: number,
  scaleFactor: ScaleFactor,
) => {
  // Generate new cloud occasionally
  if (
    frameCount % CLOUD_FREQUENCY === 0 &&
    clouds.length < CLOUD_COUNT_RANGE.MAX
  ) {
    // Apply device-specific scaling to cloud size
    const cloudSizePercent = CanvasUtil.getScaledValue(
      BASE_CLOUD_SIZE_PERCENT,
      scaleFactor,
    );

    // Apply scaleFactor to cloud dimensions
    const scaleVariation =
      Math.random() * (CLOUD_SCALE_RANGE.MAX - CLOUD_SCALE_RANGE.MIN) +
      CLOUD_SCALE_RANGE.MIN;
    const baseCloudWidth = width * cloudSizePercent;
    const cloudWidth = baseCloudWidth * scaleVariation * scaleFactor.widthScale;

    const aspectRatio = ASSETS.COORDS.CLOUD.width / ASSETS.COORDS.CLOUD.height;
    const cloudHeight = cloudWidth / aspectRatio;

    // Calculate speed based on size - larger clouds move faster (appear closer)
    const normalizedScale =
      (scaleVariation - CLOUD_SCALE_RANGE.MIN) /
      (CLOUD_SCALE_RANGE.MAX - CLOUD_SCALE_RANGE.MIN);
    const speedMultiplier =
      CLOUD_SPEED_MULTIPLIER.MIN +
      normalizedScale *
        (CLOUD_SPEED_MULTIPLIER.MAX - CLOUD_SPEED_MULTIPLIER.MIN);

    clouds.push({
      x: width,
      y:
        height *
        (Math.random() * (CLOUD_VERTICAL_RANGE.MAX - CLOUD_VERTICAL_RANGE.MIN) +
          CLOUD_VERTICAL_RANGE.MIN),
      width: cloudWidth,
      height: cloudHeight,
      speedMultiplier,
      opacity:
        Math.random() * (CLOUD_OPACITY_RANGE.MAX - CLOUD_OPACITY_RANGE.MIN) +
        CLOUD_OPACITY_RANGE.MIN,
      scale: scaleVariation,
    });
  }

  // Move clouds with individual speeds based on their size
  clouds = clouds.filter((cloud) => {
    // Each cloud moves at its own speed, based on its size
    const cloudSpeed = pipeSpeed * cloud.speedMultiplier;
    cloud.x -= cloudSpeed * scaleFactor.widthScale;
    return cloud.x > -cloud.width; // Remove clouds that are off-screen
  });
};

// When drawing clouds
const drawClouds = (
  ctx: CanvasRenderingContext2D,
  scaleFactor: ScaleFactor,
) => {
  const tilesImage = ASSETS.TILES;

  if (!tilesImage.complete) return;

  clouds.forEach((cloud) => {
    // Round dimensions for cache key and drawing
    const roundedWidth = Math.round(cloud.width);
    const roundedHeight = Math.round(cloud.height);
    const roundedScale = cloud.scale.toFixed(1);
    const roundedOpacity = cloud.opacity.toFixed(1);

    // Include devicePixelRatio in cache key for proper high-DPI rendering
    const cacheKey = `cloud_${roundedWidth}_${roundedHeight}_${roundedScale}_${roundedOpacity}_${scaleFactor.devicePixelRatio}`;

    // Account for devicePixelRatio in cache dimensions
    const cacheDimensions = {
      width: roundedWidth * scaleFactor.devicePixelRatio,
      height: roundedHeight * scaleFactor.devicePixelRatio,
    };

    // Get or create cached cloud
    const cachedCloud = CanvasUtil.getOrCreateCachedCanvas(
      CanvasCacheService.caches.cloud,
      cacheKey,
      cacheDimensions,
      (canvas) => {
        const cacheCtx = canvas.getContext('2d');
        if (!cacheCtx) return;

        // Scale context for high-DPI rendering
        cacheCtx.scale(
          scaleFactor.devicePixelRatio,
          scaleFactor.devicePixelRatio,
        );

        // Set global alpha for cloud opacity
        cacheCtx.globalAlpha = cloud.opacity;

        // Draw cloud sprite
        cacheCtx.drawImage(
          tilesImage,
          ASSETS.COORDS.CLOUD.x,
          ASSETS.COORDS.CLOUD.y,
          ASSETS.COORDS.CLOUD.width,
          ASSETS.COORDS.CLOUD.height,
          0,
          0,
          roundedWidth / scaleFactor.devicePixelRatio, // Adjust for scaled context
          roundedHeight / scaleFactor.devicePixelRatio, // Adjust for scaled context
        );

        // Reset global alpha
        cacheCtx.globalAlpha = 1;
      },
      20, // Max cache size
    );

    // Draw the cached cloud at rounded position
    const roundedX = Math.round(cloud.x);
    const roundedY = Math.round(cloud.y);
    ctx.drawImage(
      cachedCloud,
      0,
      0,
      cachedCloud.width,
      cachedCloud.height,
      roundedX,
      roundedY,
      roundedWidth,
      roundedHeight,
    );
  });
};

// Reset clouds when game restarts
const resetClouds = () => {
  clouds = [];
};

export const CanvasCloudService = {
  generateClouds,
  updateClouds,
  drawClouds,
  resetClouds,
};
