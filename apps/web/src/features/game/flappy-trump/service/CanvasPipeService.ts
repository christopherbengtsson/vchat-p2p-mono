import {
  DIFFICULTY,
  PLAYER_X_POS_MULTIPLIER,
  PIPE_FREQUENCY,
  PIPE_GAP_MULTIPLIER,
  BASE_PIPE_WIDTH_PERCENT,
  PLAYER_WIDTH_PERCENT,
  ASSETS,
  DEBUG,
  MAX_PIPE_FREQUENCY,
} from '../model/constants';
import { ScaleFactor } from '../model/DrawProps';
import { Pipe } from '../model/Pipe';
import { CanvasUtil } from '../util/CanvasUtil';
import { CanvasCacheService } from './CanvasCacheService';

const MAX_CACHE_SIZE = 20;

const addPipe = (
  frameCountRef: React.RefObject<number>,
  pipesRef: React.RefObject<Pipe[]>,
  canvas: HTMLCanvasElement,
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
    const canvasWidth = canvas.width / scaleFactor.devicePixelRatio;
    const canvasHeight = canvas.height / scaleFactor.devicePixelRatio;

    const pipeWidthPercent = CanvasUtil.getScaledValue(
      BASE_PIPE_WIDTH_PERCENT,
      scaleFactor,
    );
    const pipeWidth = canvasWidth * pipeWidthPercent;

    const playerWidthPercent = CanvasUtil.getScaledValue(
      PLAYER_WIDTH_PERCENT,
      scaleFactor,
    );

    const playerWidth =
      (canvas.width / scaleFactor.devicePixelRatio) * playerWidthPercent;

    const pipeGap = playerWidth * PIPE_GAP_MULTIPLIER;

    // Ensure minimum gap position accounts for player height
    const minGapY = playerWidth;
    const maxGapY = canvasHeight - pipeGap - playerWidth;

    const gapY = Math.random() * (maxGapY - minGapY) + minGapY;

    // Top pipe
    pipesRef.current.push({
      x: canvasWidth,
      y: 0,
      width: pipeWidth,
      height: gapY,
      passed: false,
      isUpperPipe: true,
    });

    // Bottom pipe
    pipesRef.current.push({
      x: canvasWidth,
      y: gapY + pipeGap,
      width: pipeWidth,
      height: canvasHeight - (gapY + pipeGap),
      passed: false,
      isUpperPipe: false,
    });
  }
};

const movePipes = (
  pipesRef: React.RefObject<Pipe[]>,
  pipesPassedRef: React.RefObject<number>,
  scaleFactor: ScaleFactor,
  canvasWidth: number,
) => {
  const speed =
    Math.min(
      DIFFICULTY.INITIAL_SPEED +
        pipesPassedRef.current * DIFFICULTY.SPEED_INCREMENT,
      DIFFICULTY.MAX_SPEED,
    ) * scaleFactor.widthScale;

  const playerX = canvasWidth * PLAYER_X_POS_MULTIPLIER;

  for (let i = 0; i < pipesRef.current.length; i++) {
    const pipe = pipesRef.current[i];
    pipe.x -= speed;

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

const removePipes = (pipesRef: React.RefObject<Pipe[]>) => {
  pipesRef.current = pipesRef.current.filter((pipe) => pipe.x + pipe.width > 0);
};

const getPipeSpeed = (
  pipesPassedRef: React.RefObject<number>,
  scaleFactor: ScaleFactor,
) =>
  Math.min(
    DIFFICULTY.INITIAL_SPEED +
      pipesPassedRef.current * DIFFICULTY.SPEED_INCREMENT,
    DIFFICULTY.MAX_SPEED,
  ) * scaleFactor.widthScale;

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
  ctx.drawImage(
    tilesImage,
    pipeTopCoords.x,
    pipeTopCoords.y,
    pipeTopCoords.width,
    pipeTopCoords.height,
    0,
    0,
    pipeWidth,
    pipeTopHeight,
  );

  // Draw pipe body (repeating middle section)
  const pipeBodyHeight = pipeHeight - pipeTopHeight;
  if (pipeBodyHeight > 0) {
    // Calculate middle section width (slightly narrower) based on rounded pipeWidth
    const middleWidthRatio = pipeCoords.width / pipeTopCoords.width; // Use top cap for ratio consistency
    const middleWidth = Math.round(pipeWidth * middleWidthRatio);
    const xOffset = Math.round((pipeWidth - middleWidth) / 2); // Center the narrower pipe body

    // Use original pipeWidthRatio for calculating scaled height from source aspect ratio
    const scaledPipeHeight = pipeCoords.height * pipeWidthRatio;
    const roundedScaledPipeHeight = Math.max(1, Math.round(scaledPipeHeight)); // Ensure at least 1 pixel

    const repetitions = Math.ceil(pipeBodyHeight / roundedScaledPipeHeight);

    for (let i = 0; i < repetitions; i++) {
      const y = Math.round(pipeTopHeight + i * roundedScaledPipeHeight);
      // Calculate the height for this segment, ensuring it doesn't exceed the remaining body height
      const remainingHeight = pipeBodyHeight - (y - pipeTopHeight);
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

      ctx.drawImage(
        tilesImage,
        pipeCoords.x,
        pipeCoords.y,
        pipeCoords.width,
        sourceHeight,
        xOffset,
        y,
        middleWidth,
        drawHeight,
      );
    }
  }
};

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

  // Calculate middle section width (slightly narrower) based on rounded pipeWidth
  const middleWidthRatio = pipeCoords.width / pipeBottomCoords.width; // Use bottom cap for ratio consistency
  const middleWidth = Math.round(pipeWidth * middleWidthRatio);
  const xOffset = Math.round((pipeWidth - middleWidth) / 2);

  // Draw pipe body (repeating middle section)
  const pipeBodyHeight = pipeHeight - pipeBottomHeight;
  if (pipeBodyHeight > 0) {
    // Use original pipeWidthRatio for calculating scaled height from source aspect ratio
    const scaledPipeHeight = pipeCoords.height * pipeWidthRatio;
    const roundedScaledPipeHeight = Math.max(1, Math.round(scaledPipeHeight)); // Ensure at least 1 pixel

    const repetitions = Math.ceil(pipeBodyHeight / roundedScaledPipeHeight);

    for (let i = 0; i < repetitions; i++) {
      const y = Math.round(i * roundedScaledPipeHeight);
      // Calculate the height for this segment, ensuring it doesn't exceed the remaining body height
      const remainingHeight = pipeBodyHeight - y;
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

      ctx.drawImage(
        tilesImage,
        pipeCoords.x,
        pipeCoords.y,
        pipeCoords.width,
        sourceHeight,
        xOffset,
        y,
        middleWidth,
        drawHeight,
      );
    }
  }

  // Draw pipe bottom cap at the bottom of the upper pipe
  ctx.drawImage(
    tilesImage,
    pipeBottomCoords.x,
    pipeBottomCoords.y,
    pipeBottomCoords.width,
    pipeBottomCoords.height,
    0,
    Math.round(pipeHeight - pipeBottomHeight),
    pipeWidth,
    pipeBottomHeight,
  );
};

const drawPipes = (
  ctx: CanvasRenderingContext2D,
  pipes: Pipe[],
  scaleFactor: ScaleFactor,
) => {
  const tilesImage = ASSETS.TILES;

  if (!tilesImage.complete) return;

  pipes.forEach((pipe) => {
    const cacheKey = `${pipe.isUpperPipe ? 'upper' : 'lower'}_${Math.round(pipe.width)}_${Math.round(pipe.height)}`;
    const pipeDimensions = {
      width: pipe.width,
      height: pipe.height,
    };

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
      MAX_CACHE_SIZE,
    );

    const pipeXRounded = Math.round(pipe.x);
    const pipeYRounded = Math.round(pipe.y);
    ctx.drawImage(cachedPipe, pipeXRounded, pipeYRounded);

    if (DEBUG.SHOW_HITBOX) {
      const borderWidth = Math.max(1, Math.floor(2 * scaleFactor.widthScale));
      ctx.strokeStyle = DEBUG.HITBOX_COLOR;
      ctx.lineWidth = borderWidth;

      // --- START HITBOX ADJUSTMENT ---
      // Calculate dimensions needed for the two-part hitbox
      // Reuse logic similar to drawLowerPipe/drawUpperPipe

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
      // --- END HITBOX ADJUSTMENT ---
    }
  });
};

export const CanvasPipeService = {
  addPipe,
  movePipes,
  removePipes,
  getPipeSpeed,
  drawPipes,
  drawUpperPipe,
  drawLowerPipe,
};
