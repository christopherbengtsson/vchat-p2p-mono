import { COLORS, TYPOGRAPHY } from '../model/constants';
import { ScaleFactor } from '../model/DrawProps';
import { getOrCreateCachedCanvas } from '../util/CanvasUtils';
import { CanvasCacheService } from './CanvasCacheService';

// Score rendering with device-specific scaling
const drawScore = (
  ctx: CanvasRenderingContext2D,
  score: number,
  scaleFactor: ScaleFactor,
) => {
  const { width } = ctx.canvas;

  // No need for device-specific scaling
  const fontSize = Math.max(
    16, // Minimum font size
    Math.round(TYPOGRAPHY.BASE_SCORE_FONT_SIZE * scaleFactor.heightScale),
  );
  const padding = Math.round(TYPOGRAPHY.SCORE_PADDING * scaleFactor.widthScale);

  // Use rounded fontSize in cache key
  const cacheKey = `${score}_${fontSize}_${Math.round(width)}_${scaleFactor.deviceType}`;

  // Estimate dimensions needed for the cache canvas
  const dimensions = {
    width: Math.round(width), // Use rounded width
    height: Math.round(fontSize * 1.5), // Use rounded font size for height estimate
  };

  // Get or create cached score
  const cachedScore = getOrCreateCachedCanvas(
    CanvasCacheService.caches.score,
    cacheKey,
    dimensions, // Pass rounded dimensions for canvas creation
    (canvas) => {
      const cacheCtx = canvas.getContext('2d');
      if (!cacheCtx) return;

      cacheCtx.font = `bold ${fontSize}px ${TYPOGRAPHY.SCORE_FONT_FAMILY}`;
      cacheCtx.fillStyle = COLORS.SCORE;
      cacheCtx.textAlign = 'left';
      cacheCtx.textBaseline = 'top'; // Draw text from the top-left

      // Add shadow for better visibility
      cacheCtx.shadowColor = COLORS.SCORE_SHADOW;
      cacheCtx.shadowBlur = 4; // Keep shadow settings as they were
      cacheCtx.shadowOffsetX = 1;
      cacheCtx.shadowOffsetY = 1;

      // Draw text at rounded padding coordinate
      cacheCtx.fillText(`Score: ${score}`, padding, 0); // Draw at (padding, 0) within the cache
    },
    30, // Max cache size
  );

  // Draw the cached score at the top-left of the main canvas
  ctx.drawImage(cachedScore, 0, 0);
};

export const CanvasScoreService = {
  drawScore,
};
