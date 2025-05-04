import { COLORS, TYPOGRAPHY } from '../model/constants';
import { ScaleFactor } from '../model/DrawProps';
import { CanvasUtil } from '../util/CanvasUtil';
import { CanvasCacheService, MAX_CACHE_SIZE } from './CanvasCacheService';

const drawScore = (
  ctx: CanvasRenderingContext2D,
  score: number,
  scaleFactor: ScaleFactor,
) => {
  const { width } = ctx.canvas;

  // No need for device-specific scaling
  const fontSize = Math.max(
    TYPOGRAPHY.MIN_FONT_SIZE,
    Math.round(TYPOGRAPHY.BASE_SCORE_FONT_SIZE * scaleFactor.heightScale),
  );
  const padding = Math.round(TYPOGRAPHY.SCORE_PADDING * scaleFactor.widthScale);

  const cacheKey = `${score}_${fontSize}_${Math.round(width)}_${scaleFactor.deviceType}`;

  const dimensions = {
    width: Math.round(width),
    height: Math.round(fontSize * TYPOGRAPHY.LINE_HEIGHT_RATIO),
  };

  const cachedScore = CanvasUtil.getOrCreateCachedCanvas(
    CanvasCacheService.caches.score,
    cacheKey,
    dimensions,
    (canvas) => {
      const cacheCtx = canvas.getContext('2d');
      if (!cacheCtx) return;

      cacheCtx.font = `bold ${fontSize}px ${TYPOGRAPHY.SCORE_FONT_FAMILY}`;
      cacheCtx.fillStyle = COLORS.SCORE;
      cacheCtx.textAlign = 'left';
      cacheCtx.textBaseline = 'top';

      cacheCtx.shadowColor = COLORS.SCORE_SHADOW;
      cacheCtx.shadowBlur = 4;
      cacheCtx.shadowOffsetX = 1;
      cacheCtx.shadowOffsetY = 1;

      cacheCtx.fillText(`Score: ${score}`, padding, 0);
    },
    MAX_CACHE_SIZE.SCORE,
  );

  // Draw the cached score at the top-left of the main canvas
  ctx.drawImage(cachedScore, 0, 0);
};

export const CanvasScoreService = {
  drawScore,
};
