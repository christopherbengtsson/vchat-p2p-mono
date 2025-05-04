import {
  GRAVITY,
  BASE_PLAYER_SIZE_PERCENT,
  SMOOTHING_FACTOR,
  ASSETS,
  DEBUG,
} from '../model/constants';
import { ScaleFactor } from '../model/DrawProps';
import { CanvasUtil } from '../util/CanvasUtil';
import { AudioFrequencyService } from './AudioFrequencyService';
import { CanvasCacheService } from './CanvasCacheService';

// Player physics and position updates
const updatePlayerPosition = (
  [pitch, clarity]: [number, number],
  canvas: HTMLCanvasElement,
  playerYRef: React.RefObject<number>,
  velocityRef: React.RefObject<number>,
  scaleFactor: ScaleFactor,
) => {
  // Calculate logical canvas dimensions (removing device pixel ratio) - do once
  const canvasWidth = canvas.width / scaleFactor.devicePixelRatio;
  const canvasHeight = canvas.height / scaleFactor.devicePixelRatio;

  // Apply device-specific scaling to player size
  const playerSizePercent = CanvasUtil.getScaledValue(
    BASE_PLAYER_SIZE_PERCENT,
    scaleFactor,
  );
  const playerSize = canvasWidth * playerSizePercent;

  const maxY = canvasHeight - playerSize;
  const scaledGravity = GRAVITY * scaleFactor.heightScale;

  let voiceInputDetected = false;

  if (
    pitch > AudioFrequencyService.PITCH_THRESHOLD &&
    clarity > AudioFrequencyService.CLARITY_THRESHOLD
  ) {
    voiceInputDetected = true;

    // Map the pitch to a Y position on the canvas
    const normalizedPitch =
      Math.min(pitch, AudioFrequencyService.MAX_FREQUENCY) /
      AudioFrequencyService.MAX_FREQUENCY;
    const targetY = (1 - normalizedPitch) * canvasHeight;

    // Calculate velocity based on position change
    const previousY = playerYRef.current;
    playerYRef.current =
      playerYRef.current + (targetY - playerYRef.current) * SMOOTHING_FACTOR;

    // Update velocity based on movement direction
    velocityRef.current = (playerYRef.current - previousY) / 5; // Divide by 5 to dampen effect
  }

  if (!voiceInputDetected) {
    // Apply gravity to make the player fall
    velocityRef.current += scaledGravity;
    playerYRef.current += velocityRef.current;
  }

  // Apply boundaries in the same function
  // Prevent the player from going above the canvas
  if (playerYRef.current < 0) {
    playerYRef.current = 0;
    velocityRef.current = 0;
  }

  // Prevent the player from falling below the canvas
  if (playerYRef.current > maxY) {
    playerYRef.current = maxY;
    velocityRef.current = 0;
  }

  return voiceInputDetected;
};

// Player rendering
const drawPlayer = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number, // This is the calculated (potentially float) desired width
  velocity: number,
  scaleFactor: ScaleFactor,
) => {
  const tilesImage = ASSETS.TILES;
  if (!tilesImage.complete) return;

  const playerCoords =
    velocity > 0 ? ASSETS.COORDS.TRUMP_EYEBROWS_UP : ASSETS.COORDS.TRUMP;

  // Calculate height while maintaining aspect ratio based on original width
  const aspectRatio = playerCoords.width / playerCoords.height;
  const height = width / aspectRatio;

  // Use rounded dimensions for cache key and canvas creation
  const roundedWidth = Math.round(width);
  const roundedHeight = Math.round(height);
  const cacheKey = `${roundedWidth}_${roundedHeight}_${velocity > 0 ? 'up' : 'normal'}_${scaleFactor.deviceType}`;

  const dimensions = { width: roundedWidth, height: roundedHeight };

  // Get or create cached player
  const cachedPlayer = CanvasUtil.getOrCreateCachedCanvas(
    CanvasCacheService.caches.player,
    cacheKey,
    dimensions, // Use rounded dimensions for cache canvas
    (canvas) => {
      // canvas here has rounded dimensions
      const cacheCtx = canvas.getContext('2d');
      if (!cacheCtx) return;

      // Draw onto the cache using the canvas's (rounded) dimensions
      cacheCtx.drawImage(
        tilesImage,
        playerCoords.x, // Source X
        playerCoords.y, // Source Y
        playerCoords.width, // Source Width
        playerCoords.height, // Source Height
        0, // Destination X on cache
        0, // Destination Y on cache
        canvas.width, // Destination Width (rounded)
        canvas.height, // Destination Height (rounded)
      );
    },
    10, // Max cache size
  );

  // Draw the cached player using rounded positions on the main canvas
  const roundedX = Math.round(x);
  const roundedY = Math.round(y);
  ctx.drawImage(cachedPlayer, roundedX, roundedY);

  // Draw debug hitbox if enabled
  if (DEBUG.SHOW_HITBOX) {
    ctx.strokeStyle = DEBUG.HITBOX_COLOR;
    ctx.lineWidth = 2; // Keep line width consistent
    // Draw hitbox using the rounded position and the actual cached image size
    ctx.strokeRect(roundedX, roundedY, cachedPlayer.width, cachedPlayer.height);
  }
};

export const CanvasPlayerService = {
  updatePlayerPosition,
  drawPlayer,
};
