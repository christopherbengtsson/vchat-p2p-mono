import {
  GRAVITY,
  BASE_PLAYER_SIZE_PERCENT,
  SMOOTHING_FACTOR,
  ASSETS,
  DEBUG,
  VELOCITY_DAMP,
  DEATH_PHYSICS,
} from '../model/constants';
import type { ScaleFactor } from '../model/DrawProps';
import { CanvasUtil } from '../util/CanvasUtil';
import { AudioFrequencyService } from './AudioFrequencyService';
import { CanvasCacheService, MAX_CACHE_SIZE } from './CanvasCacheService';

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

const updateDeathAnimation = (
  playerXRef: React.RefObject<number>,
  playerYRef: React.RefObject<number>,
  velocityRef: React.RefObject<number>,
  scaleFactor: ScaleFactor,
) => {
  const scaledGravity =
    GRAVITY * DEATH_PHYSICS.GRAVITY_MULTIPLIER * scaleFactor.heightScale;
  velocityRef.current += scaledGravity;

  playerYRef.current += velocityRef.current;

  playerXRef.current +=
    DEATH_PHYSICS.HORIZONTAL_VELOCITY * scaleFactor.widthScale;

  // No need to check for upper boundary during death animation
  // Player should fall off the screen
};

const drawPlayer = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  velocity: number,
  scaleFactor: ScaleFactor,
  isDead = false,
  deathFrames = 0,
) => {
  const tilesImage = ASSETS.TILES;
  if (!tilesImage.complete) return;

  let playerCoords = ASSETS.COORDS.TRUMP;

  if (isDead) {
    playerCoords = ASSETS.COORDS.TRUMP_EYEBROWS_UP;
  } else if (velocity > 0) {
    playerCoords = ASSETS.COORDS.TRUMP_EYEBROWS_UP;
  }

  const aspectRatio = playerCoords.width / playerCoords.height;
  const height = width / aspectRatio;

  const roundedWidth = Math.round(width);
  const roundedHeight = Math.round(height);

  const cacheKey = `${roundedWidth}_${roundedHeight}_${velocity > 0 ? 'up' : 'normal'}_${isDead ? 'dead' : 'alive'}_${scaleFactor.deviceType}`;

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
    MAX_CACHE_SIZE.PLAYER,
  );

  const roundedX = Math.round(x);
  const roundedY = Math.round(y);

  if (isDead) {
    ctx.save();

    const centerX = roundedX + cachedPlayer.width / 2;
    const centerY = roundedY + cachedPlayer.height / 2;

    const rotation =
      (deathFrames * DEATH_PHYSICS.ROTATION_SPEED) % (Math.PI * 2);

    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
    ctx.drawImage(
      cachedPlayer,
      -cachedPlayer.width / 2,
      -cachedPlayer.height / 2,
    );

    ctx.restore();
  } else {
    ctx.drawImage(cachedPlayer, roundedX, roundedY);
  }

  if (DEBUG.SHOW_HITBOX) {
    ctx.strokeStyle = DEBUG.HITBOX_COLOR;
    ctx.lineWidth = 2;
    ctx.strokeRect(roundedX, roundedY, cachedPlayer.width, cachedPlayer.height);
  }
};

export const CanvasPlayerService = {
  updatePlayerPosition,
  updateDeathAnimation,
  drawPlayer,
};
