import { ScaleFactor } from '../model/DrawProps';

/**
 * Applies device-specific scaling to a base value
 */
const getScaledValue = (
  baseValue: number,
  scaleFactor: ScaleFactor,
): number => {
  const deviceScaling = scaleFactor.deviceScaleFactor || 1;
  return baseValue * deviceScaling;
};

/**
 * Disables image smoothing on a canvas context for pixel-perfect rendering
 */
const disableImageSmoothing = (ctx: CanvasRenderingContext2D) => {
  ctx.imageSmoothingEnabled = false;
};

/**
 * Limits the size of a cache to prevent memory issues
 */
const limitCacheSize = <T>(cache: Map<string, T>, maxSize: number) => {
  if (cache.size > maxSize) {
    const keysToDelete = Array.from(cache.keys()).slice(
      0,
      cache.size - maxSize,
    );
    keysToDelete.forEach((key) => cache.delete(key));
  }
};

/**
 * Generic function to get or create a cached canvas
 */
const getOrCreateCachedCanvas = <T extends { width: number; height: number }>(
  cache: Map<string, HTMLCanvasElement>,
  cacheKey: string,
  dimensions: T,
  createFn: (canvas: HTMLCanvasElement) => void,
  maxCacheSize?: number,
): HTMLCanvasElement => {
  let cachedCanvas = cache.get(cacheKey);

  // Use rounded dimensions for the canvas itself to align with pixel grid
  const roundedWidth = Math.round(dimensions.width);
  const roundedHeight = Math.round(dimensions.height);

  if (
    !cachedCanvas ||
    cachedCanvas.width !== roundedWidth ||
    cachedCanvas.height !== roundedHeight
  ) {
    cachedCanvas = document.createElement('canvas');
    // Set canvas dimensions to rounded integers
    cachedCanvas.width = roundedWidth;
    cachedCanvas.height = roundedHeight;

    const ctx = cachedCanvas.getContext('2d');
    if (ctx) {
      disableImageSmoothing(ctx);
      // Pass the original (potentially float) dimensions to createFn
      // if it needs them for ratio calculations, but it will draw onto
      // the rounded-dimension canvas.
      createFn(cachedCanvas);
    }

    cache.set(cacheKey, cachedCanvas);
    if (maxCacheSize) limitCacheSize(cache, maxCacheSize);
  }

  return cachedCanvas;
};

export const CanvasUtil = {
  getScaledValue,
  disableImageSmoothing,
  limitCacheSize,
  getOrCreateCachedCanvas,
};
