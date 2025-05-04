import {
  GRAVITY,
  BASE_PLAYER_SIZE_PERCENT,
  SMOOTHING_FACTOR,
  ASSETS,
  DEBUG,
  VELOCITY_DAMP,
} from '../model/constants';
import type { ScaleFactor } from '../model/DrawProps';
import { CanvasUtil } from '../util/CanvasUtil';
import { AudioFrequencyService } from './AudioFrequencyService';
import { CanvasCacheService } from './CanvasCacheService';

const MAX_CACHE_SIZE = 10; // TODO: Move to cache service?

const updatePlayerPosition = (
  [pitch, clarity]: [number, number],
  canvas: HTMLCanvasElement,
  playerYRef: React.RefObject<number>,
  velocityRef: React.RefObject<number>,
  scaleFactor: ScaleFactor,
) => {
  const canvasWidth = canvas.width / scaleFactor.devicePixelRatio;
  const canvasHeight = canvas.height / scaleFactor.devicePixelRatio;

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
    velocityRef.current = (playerYRef.current - previousY) / VELOCITY_DAMP; // Divide to dampen effect
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

const drawPlayer = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  velocity: number,
  scaleFactor: ScaleFactor,
) => {
  const tilesImage = ASSETS.TILES;
  if (!tilesImage.complete) return;

  const playerCoords =
    velocity > 0 ? ASSETS.COORDS.TRUMP_EYEBROWS_UP : ASSETS.COORDS.TRUMP;

  const aspectRatio = playerCoords.width / playerCoords.height;
  const height = width / aspectRatio;

  const roundedWidth = Math.round(width);
  const roundedHeight = Math.round(height);
  const cacheKey = `${roundedWidth}_${roundedHeight}_${velocity > 0 ? 'up' : 'normal'}_${scaleFactor.deviceType}`;

  const dimensions = { width: roundedWidth, height: roundedHeight };

  const cachedPlayer = CanvasUtil.getOrCreateCachedCanvas(
    CanvasCacheService.caches.player,
    cacheKey,
    dimensions,
    (canvas) => {
      const cacheCtx = canvas.getContext('2d');
      if (!cacheCtx) return;

      cacheCtx.drawImage(
        tilesImage,
        playerCoords.x,
        playerCoords.y,
        playerCoords.width,
        playerCoords.height,
        0,
        0,
        canvas.width,
        canvas.height,
      );
    },
    MAX_CACHE_SIZE,
  );

  const roundedX = Math.round(x);
  const roundedY = Math.round(y);
  ctx.drawImage(cachedPlayer, roundedX, roundedY);

  if (DEBUG.SHOW_HITBOX) {
    ctx.strokeStyle = DEBUG.HITBOX_COLOR;
    ctx.lineWidth = 2;
    ctx.strokeRect(roundedX, roundedY, cachedPlayer.width, cachedPlayer.height);
  }
};

export const CanvasPlayerService = {
  updatePlayerPosition,
  drawPlayer,
};
