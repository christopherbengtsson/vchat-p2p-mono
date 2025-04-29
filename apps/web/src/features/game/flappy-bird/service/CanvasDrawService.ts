import type { Wall } from '../model/Wall';
import type { DrawProps, ScaleFactor } from '../model/DrawProps';
import {
  COLORS,
  PLAYER_WIDTH_PERCENT,
  TYPOGRAPHY,
  DEBUG,
  PLAYER_X_POS_MULTIPLIER,
  ASSETS,
  BACKGROUND_SPEED_MULTIPLIER,
} from '../model/CanvasConstants';

// Cache objects
const caches = {
  background: new Map<string, HTMLCanvasElement>(),
  wall: new Map<string, HTMLCanvasElement>(),
  player: new Map<string, HTMLCanvasElement>(),
  score: new Map<string, HTMLCanvasElement>(),
};

// Scrolling state
let backgroundPosition = 0;

// Utility functions
const disableImageSmoothing = (ctx: CanvasRenderingContext2D) => {
  ctx.imageSmoothingEnabled = false;
};

const limitCacheSize = <T>(cache: Map<string, T>, maxSize: number) => {
  if (cache.size > maxSize) {
    const keysToDelete = Array.from(cache.keys()).slice(
      0,
      cache.size - maxSize,
    );
    keysToDelete.forEach((key) => cache.delete(key));
  }
};

const clearCache = () => {
  Object.values(caches).forEach((cache) => cache.clear());
};

// Background rendering
const drawBackground = (
  ctx: CanvasRenderingContext2D,
  scaleFactor: ScaleFactor,
  speed: number,
) => {
  const canvas = ctx.canvas;
  const width = canvas.width / scaleFactor.devicePixelRatio;
  const height = canvas.height / scaleFactor.devicePixelRatio;
  const tilesImage = ASSETS.TILES;
  const skyCoords = ASSETS.COORDS.SKY;

  // Fallback if image isn't loaded
  if (!tilesImage.complete) {
    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  // Calculate dimensions
  const aspectRatio = skyCoords.width / skyCoords.height;
  const scaledWidth = height * aspectRatio;
  const cacheKey = `sky_${height.toFixed(0)}_${scaleFactor.devicePixelRatio}`;

  // Get or create cached background
  let cachedBackground = caches.background.get(cacheKey);
  if (
    !cachedBackground ||
    cachedBackground.height !== height * scaleFactor.devicePixelRatio
  ) {
    cachedBackground = createCachedBackground(
      height,
      scaledWidth,
      scaleFactor,
      tilesImage,
      skyCoords,
    );
    caches.background.set(cacheKey, cachedBackground);
  }

  // Update scrolling position
  backgroundPosition = (backgroundPosition + speed) % scaledWidth;

  // Draw tiled background with scrolling
  const numTiles = Math.ceil(width / scaledWidth) + 1;
  for (let i = 0; i < numTiles; i++) {
    const x = Math.round(i * scaledWidth - backgroundPosition);
    ctx.drawImage(
      cachedBackground,
      0,
      0,
      cachedBackground.width,
      cachedBackground.height,
      x,
      0,
      scaledWidth,
      height,
    );
  }
};

const createCachedBackground = (
  height: number,
  scaledWidth: number,
  scaleFactor: ScaleFactor,
  tilesImage: HTMLImageElement,
  skyCoords: { x: number; y: number; width: number; height: number },
) => {
  const cachedBackground = document.createElement('canvas');
  cachedBackground.width = scaledWidth * scaleFactor.devicePixelRatio;
  cachedBackground.height = height * scaleFactor.devicePixelRatio;

  const cacheCtx = cachedBackground.getContext('2d');
  if (!cacheCtx) return cachedBackground;

  disableImageSmoothing(cacheCtx);
  cacheCtx.scale(scaleFactor.devicePixelRatio, scaleFactor.devicePixelRatio);
  cacheCtx.drawImage(
    tilesImage,
    skyCoords.x,
    skyCoords.y,
    skyCoords.width,
    skyCoords.height,
    0,
    0,
    scaledWidth,
    height,
  );

  return cachedBackground;
};

// Wall rendering
const drawWalls = (
  ctx: CanvasRenderingContext2D,
  walls: DrawProps['walls'],
  scaleFactor: ScaleFactor,
) => {
  const borderWidth = Math.max(1, Math.floor(2 * scaleFactor.widthScale));
  const tilesImage = ASSETS.TILES;

  if (!tilesImage.complete) return;

  walls.forEach((wall) => {
    const cacheKey = `${wall.isUpperWall ? 'upper' : 'lower'}_${wall.width.toFixed(0)}_${wall.height.toFixed(0)}`;

    // Get or create cached wall
    let cachedWall = caches.wall.get(cacheKey);
    if (
      !cachedWall ||
      cachedWall.width !== wall.width ||
      cachedWall.height !== wall.height
    ) {
      cachedWall = createCachedWall(wall, tilesImage);
      caches.wall.set(cacheKey, cachedWall);
    }

    // Draw the cached wall
    ctx.drawImage(cachedWall, Math.round(wall.x), Math.round(wall.y));

    // Draw debug hitbox if enabled
    if (DEBUG.SHOW_HITBOX) {
      ctx.strokeStyle = DEBUG.HITBOX_COLOR;
      ctx.lineWidth = borderWidth;
      ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
    }
  });

  // Limit cache size
  limitCacheSize(caches.wall, 20);
};

const createCachedWall = (wall: Wall, tilesImage: HTMLImageElement) => {
  const cachedWall = document.createElement('canvas');
  cachedWall.width = wall.width;
  cachedWall.height = wall.height;

  const cacheCtx = cachedWall.getContext('2d');
  if (!cacheCtx) return cachedWall;

  disableImageSmoothing(cacheCtx);

  const bricksCoords = ASSETS.COORDS.BRICKS;
  const bottomCoords = ASSETS.COORDS.BRICKS_BOTTOM;

  // Calculate scaling factors
  const bricksWidthRatio = wall.width / bricksCoords.width;
  const bottomWidthRatio = wall.width / bottomCoords.width;
  const scaledBricksHeight = bricksCoords.height * bricksWidthRatio;
  const scaledBottomHeight = bottomCoords.height * bottomWidthRatio;

  if (wall.isUpperWall) {
    drawUpperWall(
      cacheCtx,
      wall,
      tilesImage,
      bricksCoords,
      bottomCoords,
      scaledBricksHeight,
      scaledBottomHeight,
    );
  } else {
    drawLowerWall(
      cacheCtx,
      wall,
      tilesImage,
      bricksCoords,
      bottomCoords,
      scaledBricksHeight,
      scaledBottomHeight,
    );
  }

  return cachedWall;
};

const drawUpperWall = (
  ctx: CanvasRenderingContext2D,
  wall: { width: number; height: number },
  tilesImage: HTMLImageElement,
  bricksCoords: { x: number; y: number; width: number; height: number },
  bottomCoords: { x: number; y: number; width: number; height: number },
  scaledBricksHeight: number,
  scaledBottomHeight: number,
) => {
  // Rotate for upper walls
  ctx.translate(wall.width / 2, wall.height / 2);
  ctx.rotate(Math.PI);
  ctx.translate(-wall.width / 2, -wall.height / 2);

  // Draw bottom cap (will appear at top when rotated)
  ctx.drawImage(
    tilesImage,
    bottomCoords.x,
    bottomCoords.y,
    bottomCoords.width,
    bottomCoords.height,
    0,
    wall.height - scaledBottomHeight,
    wall.width,
    scaledBottomHeight,
  );

  // Draw main brick sections
  drawBrickSections(
    ctx,
    tilesImage,
    bricksCoords,
    wall.width,
    wall.height - scaledBottomHeight,
    scaledBricksHeight,
  );
};

const drawLowerWall = (
  ctx: CanvasRenderingContext2D,
  wall: { width: number; height: number },
  tilesImage: HTMLImageElement,
  bricksCoords: { x: number; y: number; width: number; height: number },
  bottomCoords: { x: number; y: number; width: number; height: number },
  scaledBricksHeight: number,
  scaledBottomHeight: number,
) => {
  // Draw main brick sections
  drawBrickSections(
    ctx,
    tilesImage,
    bricksCoords,
    wall.width,
    wall.height - scaledBottomHeight,
    scaledBricksHeight,
  );

  // Draw bottom cap
  ctx.drawImage(
    tilesImage,
    bottomCoords.x,
    bottomCoords.y,
    bottomCoords.width,
    bottomCoords.height,
    0,
    wall.height - scaledBottomHeight,
    wall.width,
    scaledBottomHeight,
  );
};

const drawBrickSections = (
  ctx: CanvasRenderingContext2D,
  tilesImage: HTMLImageElement,
  bricksCoords: { x: number; y: number; width: number; height: number },
  wallWidth: number,
  mainBricksHeight: number,
  scaledBricksHeight: number,
) => {
  const mainBrickRepetitions = Math.ceil(mainBricksHeight / scaledBricksHeight);

  // Optimize for cases where we can draw all bricks at once
  if (
    mainBrickRepetitions === 1 ||
    mainBricksHeight % scaledBricksHeight === 0
  ) {
    ctx.drawImage(
      tilesImage,
      bricksCoords.x,
      bricksCoords.y,
      bricksCoords.width,
      bricksCoords.height,
      0,
      0,
      wallWidth,
      mainBricksHeight,
    );
    return;
  }

  // Handle partial bricks for other cases
  for (let i = 0; i < mainBrickRepetitions; i++) {
    const y = i * scaledBricksHeight;
    const isLastSection = i === mainBrickRepetitions - 1;
    const remainingHeight = mainBricksHeight - i * scaledBricksHeight;
    const height = isLastSection ? remainingHeight : scaledBricksHeight;

    if (height <= 0) continue;

    const sourceHeight = (height / scaledBricksHeight) * bricksCoords.height;
    ctx.drawImage(
      tilesImage,
      bricksCoords.x,
      bricksCoords.y,
      bricksCoords.width,
      sourceHeight,
      0,
      y,
      wallWidth,
      height,
    );
  }
};

// Score rendering
const drawScore = (
  ctx: CanvasRenderingContext2D,
  score: number,
  scaleFactor: ScaleFactor,
) => {
  const { width } = ctx.canvas;
  const fontSize = Math.max(
    16,
    Math.round(TYPOGRAPHY.SCORE_FONT_SIZE * scaleFactor.heightScale),
  );
  const padding = Math.round(TYPOGRAPHY.SCORE_PADDING * scaleFactor.widthScale);
  const cacheKey = `${score}_${fontSize}_${width}`;

  // Get or create cached score
  let cachedScore = caches.score.get(cacheKey);
  if (!cachedScore) {
    cachedScore = createCachedScore(score, fontSize, width, padding);
    caches.score.set(cacheKey, cachedScore);
    limitCacheSize(caches.score, 30);
  }

  // Draw the cached score
  ctx.drawImage(cachedScore, 0, 0);
};

const createCachedScore = (
  score: number,
  fontSize: number,
  width: number,
  padding: number,
) => {
  const cachedScore = document.createElement('canvas');
  cachedScore.width = width;
  cachedScore.height = fontSize * 1.5;

  const cacheCtx = cachedScore.getContext('2d');
  if (!cacheCtx) return cachedScore;

  disableImageSmoothing(cacheCtx);
  cacheCtx.font = `bold ${fontSize}px ${TYPOGRAPHY.SCORE_FONT_FAMILY}`;
  cacheCtx.fillStyle = COLORS.SCORE;
  cacheCtx.textAlign = 'left';
  cacheCtx.textBaseline = 'top';

  // Add shadow for better visibility
  cacheCtx.shadowColor = COLORS.SCORE_SHADOW;
  cacheCtx.shadowBlur = 4;
  cacheCtx.shadowOffsetX = 1;
  cacheCtx.shadowOffsetY = 1;

  cacheCtx.fillText(`Score: ${score}`, padding, 0);

  return cachedScore;
};

// Player rendering
const drawPlayer = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  velocity: number,
) => {
  const tilesImage = ASSETS.TILES;
  if (!tilesImage.complete) return;

  const playerCoords =
    velocity > 0 ? ASSETS.COORDS.TRUMP_EYEBROWS_UP : ASSETS.COORDS.TRUMP;

  // Calculate height while maintaining aspect ratio
  const aspectRatio = playerCoords.width / playerCoords.height;
  const height = width / aspectRatio;
  const cacheKey = `${width.toFixed(1)}_${velocity > 0 ? 'up' : 'normal'}`;

  // Get or create cached player
  let cachedPlayer = caches.player.get(cacheKey);
  if (
    !cachedPlayer ||
    cachedPlayer.width !== width ||
    cachedPlayer.height !== height
  ) {
    cachedPlayer = createCachedPlayer(width, height, tilesImage, playerCoords);
    caches.player.set(cacheKey, cachedPlayer);
    limitCacheSize(caches.player, 10);
  }

  // Draw with rounded positions to avoid subpixel rendering
  const roundedX = Math.round(x);
  const roundedY = Math.round(y);
  ctx.drawImage(cachedPlayer, roundedX, roundedY);

  // Draw debug hitbox if enabled
  if (DEBUG.SHOW_HITBOX) {
    ctx.strokeStyle = DEBUG.HITBOX_COLOR;
    ctx.lineWidth = 2;
    ctx.strokeRect(roundedX, roundedY, width, width); // Square hitbox with rounded position
  }
};

const createCachedPlayer = (
  width: number,
  height: number,
  tilesImage: HTMLImageElement,
  playerCoords: { x: number; y: number; width: number; height: number },
) => {
  const cachedPlayer = document.createElement('canvas');
  cachedPlayer.width = width;
  cachedPlayer.height = height;

  const cacheCtx = cachedPlayer.getContext('2d');
  if (!cacheCtx) return cachedPlayer;

  disableImageSmoothing(cacheCtx);
  cacheCtx.drawImage(
    tilesImage,
    playerCoords.x,
    playerCoords.y,
    playerCoords.width,
    playerCoords.height,
    0,
    0,
    width,
    height,
  );

  return cachedPlayer;
};

// Main drawing function
const drawCanvas = ({
  ctx,
  yPos,
  walls,
  score,
  scaleFactor,
  velocity,
  wallSpeed,
}: DrawProps) => {
  const canvas = ctx.canvas;
  const width = canvas.width / scaleFactor.devicePixelRatio;
  const height = canvas.height / scaleFactor.devicePixelRatio;

  // Setup rendering context
  disableImageSmoothing(ctx);
  ctx.clearRect(0, 0, width, height);

  // Draw game elements in correct order (background to foreground)
  const backgroundSpeed = wallSpeed * BACKGROUND_SPEED_MULTIPLIER;
  drawBackground(ctx, scaleFactor, backgroundSpeed);
  drawWalls(ctx, walls, scaleFactor);
  drawScore(ctx, score, scaleFactor);

  // Calculate and draw player
  const playerWidth = width * PLAYER_WIDTH_PERCENT;
  const playerX = width * PLAYER_X_POS_MULTIPLIER;
  drawPlayer(ctx, playerX, yPos, playerWidth, velocity);
};

export const CanvasDrawService = {
  drawCanvas,
  clearCache,
};
