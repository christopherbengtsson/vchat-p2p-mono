import { HEART_ANIMATION } from '../model/constants';
import { ASSETS } from '../model/constants/AssetConstants';
import type { ScaleFactor } from '../model/DrawProps';
import { CanvasUtil } from '../util/CanvasUtil';
import { CanvasCacheService, MAX_CACHE_SIZE } from './CanvasCacheService';

interface Heart {
  size: number;
  opacity: number;
  blinking: boolean;
  visible: boolean;
}

// State
let hearts: Heart[] = [];
let animationFrame = -1; // -1 means animation hasn't started
let animationComplete = false;

/**
 * Initializes the heart animation sequence
 */
const startHeartAnimation = () => {
  // Pre-create all hearts but make them invisible
  hearts = Array(HEART_ANIMATION.TOTAL_HEARTS)
    .fill(null)
    .map((_, index) => ({
      size:
        HEART_ANIMATION.BASE_SIZE_MULTIPLIER +
        index * HEART_ANIMATION.SIZE_INCREMENT,
      opacity: 1,
      blinking: false,
      visible: false,
    }));

  animationFrame = 0;
  animationComplete = false;
};

/**
 * Resets the heart animation state
 */
const resetHeartAnimation = () => {
  hearts = [];
  animationFrame = -1;
  animationComplete = false;
};

/**
 * Updates the heart animation state
 */
const updateHeartAnimation = () => {
  if (animationFrame < 0 || animationComplete) return;

  animationFrame++;

  // Make hearts visible one by one
  if (animationFrame >= HEART_ANIMATION.START_DELAY_FRAMES) {
    const heartIndex = Math.floor(
      (animationFrame - HEART_ANIMATION.START_DELAY_FRAMES) /
        HEART_ANIMATION.HEART_DELAY_FRAMES,
    );

    // Make hearts visible in sequence
    for (let i = 0; i < hearts.length; i++) {
      hearts[i].visible = i <= heartIndex;
    }
  }

  // Start blinking the last heart
  if (
    animationFrame === HEART_ANIMATION.BLINK_START_FRAME &&
    hearts.length === HEART_ANIMATION.TOTAL_HEARTS
  ) {
    hearts[HEART_ANIMATION.TOTAL_HEARTS - 1].blinking = true;
  }

  // Stop blinking
  if (
    animationFrame ===
    HEART_ANIMATION.BLINK_START_FRAME + HEART_ANIMATION.BLINK_DURATION_FRAMES
  ) {
    hearts.forEach((heart) => {
      heart.blinking = false;
    });
  }

  // Start fade out
  if (animationFrame >= HEART_ANIMATION.FADE_OUT_START_FRAME) {
    const fadeProgress =
      (animationFrame - HEART_ANIMATION.FADE_OUT_START_FRAME) /
      HEART_ANIMATION.FADE_OUT_DURATION_FRAMES;

    hearts.forEach((heart) => {
      heart.opacity = Math.max(0, 1 - fadeProgress);
    });
  }

  // End animation
  if (animationFrame >= HEART_ANIMATION.TOTAL_ANIMATION_FRAMES) {
    animationComplete = true;
    hearts = [];
  }
};

/**
 * Draws the hearts animation
 */
const drawHearts = (
  ctx: CanvasRenderingContext2D,
  playerX: number,
  playerY: number,
  playerWidth: number,
  playerHeight: number,
  scaleFactor: ScaleFactor,
) => {
  if (animationFrame < 0 || hearts.length === 0 || animationComplete) return;

  const tilesImage = ASSETS.TILES;
  if (!tilesImage.complete) return;

  // Calculate the base position where hearts should appear (above player's head)
  const heartBaseX =
    playerX + playerWidth / 2 + HEART_ANIMATION.OFFSET_X * playerWidth;
  const heartBaseY = playerY + HEART_ANIMATION.OFFSET_Y * playerHeight;

  // Calculate heart dimensions for each heart
  const heartDimensions = hearts.map((heart) => {
    const heartCoords = heart.blinking
      ? ASSETS.COORDS.PUTIN_HEART_BLINK
      : ASSETS.COORDS.PUTIN_HEART;

    const aspectRatio = heartCoords.width / heartCoords.height;
    const heartWidth = playerWidth * heart.size;
    const heartHeight = heartWidth / aspectRatio;

    return { width: heartWidth, height: heartHeight };
  });

  // Calculate positions with dynamic spacing and horizontal offset
  const positions = [];

  // Calculate positions from bottom to top with horizontal offset
  for (let i = 0; i < hearts.length; i++) {
    let currentY = heartBaseY;
    let currentX = heartBaseX;

    // Apply vertical spacing for hearts above the first one
    for (let j = 0; j < i; j++) {
      // Calculate spacing based on the sizes of adjacent hearts
      const lowerHeartHeight = heartDimensions[j].height;
      const upperHeartHeight = heartDimensions[j + 1].height;

      // Use average height for spacing calculation
      const averageHeight = (lowerHeartHeight + upperHeartHeight) / 2;
      const spacing = HEART_ANIMATION.BASE_VERTICAL_SPACING * averageHeight;

      // Move up by the spacing amount
      currentY -= spacing;

      // Move right by the horizontal offset
      currentX += HEART_ANIMATION.HORIZONTAL_OFFSET_PER_HEART * playerWidth;
    }

    positions.push({ x: currentX, y: currentY });
  }

  // Draw hearts from smallest to largest (bottom to top)
  for (let i = 0; i < hearts.length; i++) {
    const heart = hearts[i];
    if (!heart.visible || heart.opacity <= 0) continue;

    const heartCoords = heart.blinking
      ? ASSETS.COORDS.PUTIN_HEART_BLINK
      : ASSETS.COORDS.PUTIN_HEART;

    const heartWidth = heartDimensions[i].width;
    const heartHeight = heartDimensions[i].height;

    // Get position from calculated array
    const heartX = positions[i].x;
    const heartY = positions[i].y;

    const roundedWidth = Math.round(heartWidth);
    const roundedHeight = Math.round(heartHeight);

    // Create cache key based on heart state
    const cacheKey = `heart_${roundedWidth}_${roundedHeight}_${heart.blinking ? 'blink' : 'normal'}_${scaleFactor.deviceType}`;
    const dimensions = { width: roundedWidth, height: roundedHeight };

    // Get or create cached heart sprite
    const cachedHeart = CanvasUtil.getOrCreateCachedCanvas(
      CanvasCacheService.caches.heart || new Map(),
      cacheKey,
      dimensions,
      (canvas) => {
        const cacheCtx = canvas.getContext('2d');
        if (!cacheCtx) return;

        cacheCtx.drawImage(
          tilesImage,
          heartCoords.x,
          heartCoords.y,
          heartCoords.width,
          heartCoords.height,
          0,
          0,
          canvas.width,
          canvas.height,
        );
      },
      MAX_CACHE_SIZE.PLAYER, // Reuse the player cache size limit
    );

    // Apply opacity
    ctx.save();
    ctx.globalAlpha = heart.opacity;

    const roundedX = Math.round(heartX - heartWidth / 2); // Center horizontally
    const roundedY = Math.round(heartY - heartHeight / 2); // Center vertically

    ctx.drawImage(cachedHeart, roundedX, roundedY);
    ctx.restore();
  }
};

/**
 * Checks if the heart animation is currently active
 */
const isHeartAnimationActive = () => {
  return animationFrame >= 0 && !animationComplete;
};

export const CanvasHeartService = {
  startHeartAnimation,
  resetHeartAnimation,
  updateHeartAnimation,
  drawHearts,
  isHeartAnimationActive,
};
