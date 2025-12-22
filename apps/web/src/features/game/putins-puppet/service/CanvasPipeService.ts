import {
  DIFFICULTY,
  PLAYER_X_POS_MULTIPLIER,
  PIPE_FREQUENCY,
  PIPE_GAP_MULTIPLIER,
  BASE_PIPE_WIDTH_PERCENT,
  ASSETS,
  DEBUG,
  MAX_PIPE_FREQUENCY,
} from '../model/constants';
import { ScaleFactor } from '../model/DrawProps';
import { Pipe } from '../model/Pipe';
import { CanvasUtil } from '../util/CanvasUtil';
import { CanvasCacheService, MAX_CACHE_SIZE } from './CanvasCacheService';
import { PipePoolService } from './PipePoolService';

/**
 * Adds a new pipe pair to the game
 */
const addPipe = (
  frameCountRef: React.RefObject<number>,
  canvasWidth: number,
  canvasHeight: number,
  playerSize: number,
  scaleFactor: ScaleFactor,
  scoreRef: React.RefObject<number>,
) => {
  frameCountRef.current++;

  // Adjust pipe frequency based on progress
  const actualFrequency = Math.max(
    PIPE_FREQUENCY - Math.floor(scoreRef.current / 5) * 5,
    MAX_PIPE_FREQUENCY, // Don't go below MAX_PIPE_FREQUENCY (too fast)
  );

  if (frameCountRef.current % actualFrequency === 0) {
    const pipeWidthPercent = CanvasUtil.getScaledValue(
      BASE_PIPE_WIDTH_PERCENT,
      scaleFactor,
    );
    const pipeWidth = canvasWidth * pipeWidthPercent;

    const pipeGap = playerSize * PIPE_GAP_MULTIPLIER;

    // Ensure minimum gap position accounts for player height
    const minGapY = playerSize;
    const maxGapY = canvasHeight - pipeGap - playerSize;

    const gapY = Math.random() * (maxGapY - minGapY) + minGapY;

    // Acquire pipes from pool instead of creating new objects
    PipePoolService.acquire(canvasWidth, 0, pipeWidth, gapY, true);
    PipePoolService.acquire(
      canvasWidth,
      gapY + pipeGap,
      pipeWidth,
      canvasHeight - (gapY + pipeGap),
      false,
    );
  }
};

/**
 * Moves all pipes and updates score when pipes are passed
 */
const movePipes = (
  pipesPassedRef: React.RefObject<number>,
  scaleFactor: ScaleFactor,
  canvasWidth: number,
  deltaTime: number,
) => {
  const speed = getPipeSpeed(pipesPassedRef, scaleFactor);
  const playerX = canvasWidth * PLAYER_X_POS_MULTIPLIER;
  const activePipes = PipePoolService.getActivePipes();

  for (const pipe of activePipes) {
    pipe.x -= speed * deltaTime;

    // Check if pipe has passed the player - only count upper pipes to avoid double counting
    if (
      !pipe.passed &&
      pipe.isUpperPipe && // Count score only once per pipe pair
      pipe.x + pipe.width < playerX
    ) {
      pipe.passed = true;
      pipesPassedRef.current += 1;
    }
  }
};

/**
 * Removes pipes that are off-screen
 */
const removePipes = () => {
  const activePipes = PipePoolService.getActivePipes();

  // Deactivate pipes that are off-screen instead of removing them
  for (const pipe of activePipes) {
    if (pipe.x + pipe.width <= 0) {
      PipePoolService.release(pipe);
    }
  }
};

/**
 * Calculates pipe speed based on score and scale factor
 */
const getPipeSpeed = (
  pipesPassedRef: React.RefObject<number>,
  scaleFactor: ScaleFactor,
) =>
  Math.min(
    DIFFICULTY.INITIAL_SPEED +
      pipesPassedRef.current * DIFFICULTY.SPEED_INCREMENT,
    DIFFICULTY.MAX_SPEED,
  ) * scaleFactor.widthScale;

/**
 * Draws a section of a pipe
 */
const drawPipeSection = (
  ctx: CanvasRenderingContext2D,
  tilesImage: HTMLImageElement,
  sourceCoords: { x: number; y: number; width: number; height: number },
  destX: number,
  destY: number,
  destWidth: number,
  destHeight: number,
  sourceHeight?: number,
) => {
  // If sourceHeight is provided, use it, otherwise use the full sourceCoords.height
  const actualSourceHeight =
    sourceHeight !== undefined ? sourceHeight : sourceCoords.height;

  ctx.drawImage(
    tilesImage,
    sourceCoords.x,
    sourceCoords.y,
    sourceCoords.width,
    actualSourceHeight,
    destX,
    destY,
    destWidth,
    destHeight,
  );
};

/**
 * Draws the body of a pipe with repeating texture
 */
const drawPipeBody = (
  ctx: CanvasRenderingContext2D,
  tilesImage: HTMLImageElement,
  pipeCoords: { x: number; y: number; width: number; height: number },
  capCoords: { x: number; y: number; width: number; height: number },
  pipeWidth: number,
  pipeHeight: number,
  capHeight: number,
  isUpperPipe: boolean,
) => {
  // Calculate middle section width (slightly narrower) based on rounded pipeWidth
  const middleWidthRatio = pipeCoords.width / capCoords.width; // Use cap for ratio consistency
  const middleWidth = Math.round(pipeWidth * middleWidthRatio);
  const xOffset = Math.round((pipeWidth - middleWidth) / 2); // Center the narrower pipe body

  const pipeWidthRatio = pipeWidth / capCoords.width;

  // Calculate body height (total height minus cap height)
  const pipeBodyHeight = pipeHeight - capHeight;

  if (pipeBodyHeight <= 0) return; // No body to draw

  // Use original pipeWidthRatio for calculating scaled height from source aspect ratio
  const scaledPipeHeight = pipeCoords.height * pipeWidthRatio;
  const roundedScaledPipeHeight = Math.max(1, Math.round(scaledPipeHeight)); // Ensure at least 1 pixel

  const repetitions = Math.ceil(pipeBodyHeight / roundedScaledPipeHeight);

  for (let i = 0; i < repetitions; i++) {
    // For upper pipe, start from the top and work down
    // For lower pipe, start from after the cap and work down
    const y = isUpperPipe
      ? Math.round(i * roundedScaledPipeHeight)
      : Math.round(capHeight + i * roundedScaledPipeHeight);

    // Calculate the height for this segment, ensuring it doesn't exceed the remaining body height
    const remainingHeight = isUpperPipe
      ? pipeBodyHeight - y
      : pipeBodyHeight - (y - capHeight);

    const drawHeight = Math.max(
      1,
      Math.round(Math.min(roundedScaledPipeHeight, remainingHeight)),
    );

    if (drawHeight <= 0) continue;

    // Calculate source height based on the *unrounded* scaled height to maintain aspect ratio from source
    // Clamp sourceHeight to avoid reading outside the sprite bounds
    const sourceHeightRatio = drawHeight / scaledPipeHeight;
    const sourceHeight = Math.max(
      1,
      Math.min(
        pipeCoords.height,
        Math.round(sourceHeightRatio * pipeCoords.height),
      ),
    );

    drawPipeSection(
      ctx,
      tilesImage,
      pipeCoords,
      xOffset,
      y,
      middleWidth,
      drawHeight,
      sourceHeight,
    );
  }
};

/**
 * Draws a lower pipe (bottom pipe)
 */
const drawLowerPipe = (
  ctx: CanvasRenderingContext2D,
  pipe: { width: number; height: number },
  tilesImage: HTMLImageElement,
) => {
  const pipeTopCoords = ASSETS.COORDS.PIPE_TOP;
  const pipeCoords = ASSETS.COORDS.PIPE;

  const pipeWidth = pipe.width;
  const pipeHeight = pipe.height;

  const pipeWidthRatio = pipeWidth / pipeTopCoords.width;
  const pipeTopHeight = Math.round(pipeTopCoords.height * pipeWidthRatio);

  // Draw pipe top cap
  drawPipeSection(
    ctx,
    tilesImage,
    pipeTopCoords,
    0,
    0,
    pipeWidth,
    pipeTopHeight,
  );

  // Draw pipe body (repeating middle section)
  drawPipeBody(
    ctx,
    tilesImage,
    pipeCoords,
    pipeTopCoords,
    pipeWidth,
    pipeHeight,
    pipeTopHeight,
    false, // isUpperPipe = false
  );
};

/**
 * Draws an upper pipe (top pipe)
 */
const drawUpperPipe = (
  ctx: CanvasRenderingContext2D,
  pipe: { width: number; height: number },
  tilesImage: HTMLImageElement,
) => {
  const pipeBottomCoords = ASSETS.COORDS.PIPE_BOTTOM;
  const pipeCoords = ASSETS.COORDS.PIPE;

  const pipeWidth = pipe.width;
  const pipeHeight = pipe.height;

  const pipeWidthRatio = pipeWidth / pipeBottomCoords.width;
  const pipeBottomHeight = Math.round(pipeBottomCoords.height * pipeWidthRatio);

  // Draw pipe body (repeating middle section)
  drawPipeBody(
    ctx,
    tilesImage,
    pipeCoords,
    pipeBottomCoords,
    pipeWidth,
    pipeHeight,
    pipeBottomHeight,
    true, // isUpperPipe = true
  );

  // Draw pipe bottom cap at the bottom of the upper pipe
  drawPipeSection(
    ctx,
    tilesImage,
    pipeBottomCoords,
    0,
    Math.round(pipeHeight - pipeBottomHeight),
    pipeWidth,
    pipeBottomHeight,
  );
};

/**
 * Draws all pipes with hitboxes if debug mode is enabled
 */
const drawPipes = (ctx: CanvasRenderingContext2D, scaleFactor: ScaleFactor) => {
  const tilesImage = ASSETS.TILES;

  if (!tilesImage.complete) return;

  const activePipes = PipePoolService.getActivePipes();
  activePipes.forEach((pipe) => {
    const cacheKey = `${pipe.isUpperPipe ? 'upper' : 'lower'}_${Math.round(pipe.width)}_${Math.round(pipe.height)}`;
    const pipeDimensions = {
      width: pipe.width,
      height: pipe.height,
    };

    // Get or create cached pipe
    const cachedPipe = CanvasUtil.getOrCreateCachedCanvas(
      CanvasCacheService.caches.pipe,
      cacheKey,
      pipeDimensions,
      (canvas) => {
        const cacheCtx = canvas.getContext('2d');
        if (!cacheCtx) return;

        const roundedPipeDims = { width: canvas.width, height: canvas.height };

        if (pipe.isUpperPipe) {
          drawUpperPipe(cacheCtx, roundedPipeDims, tilesImage);
        } else {
          drawLowerPipe(cacheCtx, roundedPipeDims, tilesImage);
        }
      },
      MAX_CACHE_SIZE.PIPE,
    );

    const pipeXRounded = Math.round(pipe.x);
    const pipeYRounded = Math.round(pipe.y);
    ctx.drawImage(cachedPipe, pipeXRounded, pipeYRounded);

    // Draw hitbox for debugging
    if (DEBUG.SHOW_HITBOX) {
      const borderWidth = Math.max(1, Math.floor(2 * scaleFactor.widthScale));
      ctx.strokeStyle = DEBUG.HITBOX_COLOR;
      ctx.lineWidth = borderWidth;

      // Calculate dimensions needed for the two-part hitbox
      const pipeCoords = ASSETS.COORDS.PIPE;
      const capCoords = pipe.isUpperPipe
        ? ASSETS.COORDS.PIPE_BOTTOM
        : ASSETS.COORDS.PIPE_TOP;

      // Use the actual cached pipe dimensions (already rounded) for consistency
      const actualPipeWidth = cachedPipe.width;
      const actualPipeHeight = cachedPipe.height;

      const pipeWidthRatio = actualPipeWidth / capCoords.width;
      const capHeight = Math.round(capCoords.height * pipeWidthRatio);
      const capWidth = actualPipeWidth; // Cap uses the full width

      const bodyHeight = actualPipeHeight - capHeight;
      const middleWidthRatio = pipeCoords.width / capCoords.width; // Ratio based on cap sprite
      const bodyWidth = Math.round(actualPipeWidth * middleWidthRatio);
      const bodyXOffset = Math.round((actualPipeWidth - bodyWidth) / 2); // Centered offset

      // Draw two rectangles for the hitbox
      if (pipe.isUpperPipe) {
        // Upper Pipe: Body first (top part), then Cap (bottom part)
        // Body Rect (starts at pipe top, offsetted x)
        if (bodyHeight > 0) {
          ctx.strokeRect(
            pipeXRounded + bodyXOffset,
            pipeYRounded,
            bodyWidth,
            bodyHeight,
          );
        }
        // Cap Rect (starts after body, full width)
        ctx.strokeRect(
          pipeXRounded,
          pipeYRounded + bodyHeight,
          capWidth,
          capHeight,
        );
      } else {
        // Lower Pipe: Cap first (top part), then Body (bottom part)
        // Cap Rect (starts at pipe top, full width)
        ctx.strokeRect(pipeXRounded, pipeYRounded, capWidth, capHeight);
        // Body Rect (starts after cap, offsetted x)
        if (bodyHeight > 0) {
          ctx.strokeRect(
            pipeXRounded + bodyXOffset,
            pipeYRounded + capHeight,
            bodyWidth,
            bodyHeight,
          );
        }
      }
    }
  });
};

/**
 * Gets pipe dimensions for collision detection
 */
const getPipeDimensions = (pipe: Pipe) => {
  const pipeCoords = ASSETS.COORDS.PIPE;
  const capCoords = pipe.isUpperPipe
    ? ASSETS.COORDS.PIPE_BOTTOM
    : ASSETS.COORDS.PIPE_TOP;

  const pipeWidthRatio = pipe.width / capCoords.width;
  const capHeight = Math.round(capCoords.height * pipeWidthRatio);
  const middleWidthRatio = pipeCoords.width / capCoords.width;
  const bodyWidth = Math.round(pipe.width * middleWidthRatio);
  const bodyXOffset = Math.round((pipe.width - bodyWidth) / 2);

  return {
    capWidth: pipe.width,
    capHeight,
    bodyWidth,
    bodyXOffset,
    bodyHeight: pipe.height - capHeight,
  };
};

const getActivePipes = (): Pipe[] => {
  return PipePoolService.getActivePipes();
};

const initializePool = () => {
  PipePoolService.initialize();
};

const resetPipes = () => {
  PipePoolService.reset();
};

export const CanvasPipeService = {
  addPipe,
  movePipes,
  removePipes,
  getPipeSpeed,
  drawPipes,
  drawUpperPipe,
  drawLowerPipe,
  getPipeDimensions,
  getActivePipes,
  initializePool,
  resetPipes,
};
