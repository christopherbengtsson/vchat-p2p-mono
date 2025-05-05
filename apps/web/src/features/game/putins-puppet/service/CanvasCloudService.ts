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
import { CanvasCacheService, MAX_CACHE_SIZE } from './CanvasCacheService';

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

/**
 * Creates a new cloud with randomized properties
 */
const createCloud = (
  width: number,
  height: number,
  xPosition: number,
  scaleFactor: ScaleFactor,
) => {
  let deviceMultiplier = 1;
  if (scaleFactor.deviceType === 'MOBILE') {
    deviceMultiplier = 2;
  } else if (scaleFactor.deviceType === 'TABLET') {
    deviceMultiplier = 1.2;
  }

  const cloudSizePercent = BASE_CLOUD_SIZE_PERCENT * deviceMultiplier;

  const scaleVariation =
    Math.random() * (CLOUD_SCALE_RANGE.MAX - CLOUD_SCALE_RANGE.MIN) +
    CLOUD_SCALE_RANGE.MIN;

  const baseCloudWidth = width * cloudSizePercent;

  const cloudWidth = baseCloudWidth * scaleVariation;

  const aspectRatio = ASSETS.COORDS.CLOUD.width / ASSETS.COORDS.CLOUD.height;
  const cloudHeight = cloudWidth / aspectRatio;

  // Calculate speed based on size - larger clouds move faster (appear closer)
  // Map the scale variation to speed range
  const normalizedScale =
    (scaleVariation - CLOUD_SCALE_RANGE.MIN) /
    (CLOUD_SCALE_RANGE.MAX - CLOUD_SCALE_RANGE.MIN);
  const speedMultiplier =
    CLOUD_SPEED_MULTIPLIER.MIN +
    normalizedScale * (CLOUD_SPEED_MULTIPLIER.MAX - CLOUD_SPEED_MULTIPLIER.MIN);

  return {
    x: xPosition,
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
  };
};

/**
 * Generates initial clouds if none exist
 */
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
      // For initial clouds, distribute them across the screen
      const randomX = Math.random() * width;
      clouds.push(createCloud(width, height, randomX, scaleFactor));
    }
  }
};

/**
 * Updates cloud positions and generates new clouds as needed
 */
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
    // New clouds always start from the right edge
    clouds.push(createCloud(width, height, width, scaleFactor));
  }

  // Move clouds with individual speeds based on their size
  clouds = clouds.filter((cloud) => {
    // Each cloud moves at its own speed, based on its size
    const cloudSpeed = pipeSpeed * cloud.speedMultiplier;
    cloud.x -= cloudSpeed * scaleFactor.widthScale;
    return cloud.x > -cloud.width; // Remove clouds that are off-screen
  });
};

/**
 * Draws all clouds with proper opacity
 */
const drawClouds = (
  ctx: CanvasRenderingContext2D,
  scaleFactor: ScaleFactor,
) => {
  const tilesImage = ASSETS.TILES;

  if (!tilesImage.complete) return;

  clouds.forEach((cloud) => {
    const roundedWidth = Math.round(cloud.width);
    const roundedHeight = Math.round(cloud.height);
    const roundedScale = cloud.scale.toFixed(1);
    const roundedOpacity = cloud.opacity.toFixed(1);

    const cacheKey = `cloud_${roundedWidth}_${roundedHeight}_${roundedScale}_${roundedOpacity}_${scaleFactor.devicePixelRatio}`;

    const cacheDimensions = {
      width: roundedWidth * scaleFactor.devicePixelRatio,
      height: roundedHeight * scaleFactor.devicePixelRatio,
    };

    const cachedCloud = CanvasUtil.getOrCreateCachedCanvas(
      CanvasCacheService.caches.cloud,
      cacheKey,
      cacheDimensions,
      (canvas) => {
        const cacheCtx = canvas.getContext('2d');
        if (!cacheCtx) return;

        cacheCtx.scale(
          scaleFactor.devicePixelRatio,
          scaleFactor.devicePixelRatio,
        );

        cacheCtx.globalAlpha = cloud.opacity;

        cacheCtx.drawImage(
          tilesImage,
          ASSETS.COORDS.CLOUD.x,
          ASSETS.COORDS.CLOUD.y,
          ASSETS.COORDS.CLOUD.width,
          ASSETS.COORDS.CLOUD.height,
          0,
          0,
          roundedWidth / scaleFactor.devicePixelRatio,
          roundedHeight / scaleFactor.devicePixelRatio,
        );

        cacheCtx.globalAlpha = 1;
      },
      MAX_CACHE_SIZE.CLOUD,
    );

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

const resetClouds = () => {
  clouds = [];
};

export const CanvasCloudService = {
  generateClouds,
  updateClouds,
  drawClouds,
  resetClouds,
};
