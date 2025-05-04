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
  CLOUD_COUNT_RANGE,
  CLOUD_SCALE_RANGE,
  CLOUD_SIZE_PERCENT,
  CLOUD_VERTICAL_RANGE,
  CLOUD_SPEED_MULTIPLIER,
  CLOUD_OPACITY_RANGE,
  CLOUD_FREQUENCY,
} from '../model/CanvasConstants';

// Cache objects
const caches = {
  background: new Map<string, HTMLCanvasElement>(),
  cloud: new Map<string, HTMLCanvasElement>(),
  wall: new Map<string, HTMLCanvasElement>(),
  player: new Map<string, HTMLCanvasElement>(),
  score: new Map<string, HTMLCanvasElement>(),
};

// Scrolling state
let backgroundPosition = 0;
// Cloud state
let clouds: {
  x: number;
  y: number;
  width: number;
  height: number;
  speedMultiplier: number;
  opacity: number;
  scale: number;
}[] = [];

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
  clouds = [];
};

// Generic function to get or create a cached canvas
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

// Background rendering
const drawBackground = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scaleFactor: ScaleFactor,
  speed: number,
) => {
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

  // Dimensions for cache lookup/creation (use potentially float values for accuracy)
  const cacheDimensions = {
    width: scaledWidth * scaleFactor.devicePixelRatio,
    height: height * scaleFactor.devicePixelRatio,
  };
  // Dimensions for drawing onto the cache (rounded)
  const drawDimensions = {
    width: Math.round(scaledWidth),
    height: Math.round(height),
  };

  // Get or create cached background
  const cachedBackground = getOrCreateCachedCanvas(
    caches.background,
    cacheKey,
    cacheDimensions, // Use precise dimensions for cache canvas size
    (canvas) => {
      const cacheCtx = canvas.getContext('2d');
      if (!cacheCtx) return;

      // Scale context based on devicePixelRatio for high-res displays
      cacheCtx.scale(
        scaleFactor.devicePixelRatio,
        scaleFactor.devicePixelRatio,
      );

      // Draw onto the cache using rounded dimensions for sharpness
      cacheCtx.drawImage(
        tilesImage,
        skyCoords.x,
        skyCoords.y,
        skyCoords.width,
        skyCoords.height,
        0,
        0,
        drawDimensions.width, // Use rounded width for drawing
        drawDimensions.height, // Use rounded height for drawing
      );
    },
  );

  // Update scrolling position
  const roundedScaledWidth = Math.round(scaledWidth); // Use rounded width for scroll calculation
  backgroundPosition = (backgroundPosition + speed) % roundedScaledWidth;

  // Draw tiled background with scrolling
  const numTiles = Math.ceil(width / roundedScaledWidth) + 1;
  for (let i = 0; i < numTiles; i++) {
    const x = Math.round(i * roundedScaledWidth - backgroundPosition);
    // Draw using the cache, scaling it back down to the logical size
    ctx.drawImage(
      cachedBackground,
      0,
      0,
      cachedBackground.width, // Source width from cache
      cachedBackground.height, // Source height from cache
      x, // Rounded position on main canvas
      0,
      roundedScaledWidth, // Draw width on main canvas (rounded)
      Math.round(height), // Draw height on main canvas (rounded)
    );
  }
};

// When generating initial clouds
const generateClouds = (
  width: number,
  height: number,
  scaleFactor: ScaleFactor,
) => {
  // Initialize clouds if empty
  if (clouds.length === 0) {
    const cloudCount = Math.floor(
      Math.random() * (CLOUD_COUNT_RANGE.MAX - CLOUD_COUNT_RANGE.MIN + 1) +
        CLOUD_COUNT_RANGE.MIN,
    );

    for (let i = 0; i < cloudCount; i++) {
      // Apply scaleFactor to cloud dimensions
      const scaleVariation =
        Math.random() * (CLOUD_SCALE_RANGE.MAX - CLOUD_SCALE_RANGE.MIN) +
        CLOUD_SCALE_RANGE.MIN;
      const baseCloudWidth = width * CLOUD_SIZE_PERCENT;
      const cloudWidth =
        baseCloudWidth * scaleVariation * scaleFactor.widthScale;

      const aspectRatio =
        ASSETS.COORDS.CLOUD.width / ASSETS.COORDS.CLOUD.height;
      const cloudHeight = cloudWidth / aspectRatio;

      // Calculate speed based on size - larger clouds move faster (appear closer)
      // Map the scale variation (0.7-1.3) to speed range (0.2-0.4)
      const normalizedScale =
        (scaleVariation - CLOUD_SCALE_RANGE.MIN) /
        (CLOUD_SCALE_RANGE.MAX - CLOUD_SCALE_RANGE.MIN);
      const speedMultiplier =
        CLOUD_SPEED_MULTIPLIER.MIN +
        normalizedScale *
          (CLOUD_SPEED_MULTIPLIER.MAX - CLOUD_SPEED_MULTIPLIER.MIN);

      clouds.push({
        x: Math.random() * width,
        y:
          height *
          (Math.random() *
            (CLOUD_VERTICAL_RANGE.MAX - CLOUD_VERTICAL_RANGE.MIN) +
            CLOUD_VERTICAL_RANGE.MIN),
        width: cloudWidth,
        height: cloudHeight,
        speedMultiplier,
        opacity:
          Math.random() * (CLOUD_OPACITY_RANGE.MAX - CLOUD_OPACITY_RANGE.MIN) +
          CLOUD_OPACITY_RANGE.MIN,
        scale: scaleVariation,
      });
    }
  }
};

// When adding new clouds
const updateClouds = (
  width: number,
  height: number,
  frameCount: number,
  wallSpeed: number,
  scaleFactor: ScaleFactor,
) => {
  // Generate new cloud occasionally
  if (
    frameCount % CLOUD_FREQUENCY === 0 &&
    clouds.length < CLOUD_COUNT_RANGE.MAX
  ) {
    // Apply scaleFactor to cloud dimensions
    const scaleVariation =
      Math.random() * (CLOUD_SCALE_RANGE.MAX - CLOUD_SCALE_RANGE.MIN) +
      CLOUD_SCALE_RANGE.MIN;
    const baseCloudWidth = width * CLOUD_SIZE_PERCENT;
    const cloudWidth = baseCloudWidth * scaleVariation * scaleFactor.widthScale;

    const aspectRatio = ASSETS.COORDS.CLOUD.width / ASSETS.COORDS.CLOUD.height;
    const cloudHeight = cloudWidth / aspectRatio;

    // Calculate speed based on size - larger clouds move faster (appear closer)
    const normalizedScale =
      (scaleVariation - CLOUD_SCALE_RANGE.MIN) /
      (CLOUD_SCALE_RANGE.MAX - CLOUD_SCALE_RANGE.MIN);
    const speedMultiplier =
      CLOUD_SPEED_MULTIPLIER.MIN +
      normalizedScale *
        (CLOUD_SPEED_MULTIPLIER.MAX - CLOUD_SPEED_MULTIPLIER.MIN);

    clouds.push({
      x: width,
      y:
        height *
        (Math.random() * (CLOUD_VERTICAL_RANGE.MAX - CLOUD_VERTICAL_RANGE.MIN) +
          CLOUD_VERTICAL_RANGE.MIN),
      width: cloudWidth,
      height: cloudHeight,
      speedMultiplier,
      opacity:
        Math.random() * (CLOUD_OPACITY_RANGE.MAX - CLOUD_OPACITY_RANGE.MIN) +
        CLOUD_OPACITY_RANGE.MIN,
      scale: scaleVariation,
    });
  }

  // Move clouds with individual speeds based on their size
  clouds = clouds.filter((cloud) => {
    // Each cloud moves at its own speed, based on its size
    const cloudSpeed = wallSpeed * cloud.speedMultiplier;
    cloud.x -= cloudSpeed * scaleFactor.widthScale;
    return cloud.x > -cloud.width; // Remove clouds that are off-screen
  });
};

// When drawing clouds
const drawClouds = (
  ctx: CanvasRenderingContext2D,
  scaleFactor: ScaleFactor,
) => {
  const tilesImage = ASSETS.TILES;

  if (!tilesImage.complete) return;

  clouds.forEach((cloud) => {
    // Round dimensions for cache key and drawing
    const roundedWidth = Math.round(cloud.width);
    const roundedHeight = Math.round(cloud.height);
    const roundedScale = cloud.scale.toFixed(1);
    const roundedOpacity = cloud.opacity.toFixed(1);

    // Include devicePixelRatio in cache key for proper high-DPI rendering
    const cacheKey = `cloud_${roundedWidth}_${roundedHeight}_${roundedScale}_${roundedOpacity}_${scaleFactor.devicePixelRatio}`;

    // Account for devicePixelRatio in cache dimensions
    const cacheDimensions = {
      width: roundedWidth * scaleFactor.devicePixelRatio,
      height: roundedHeight * scaleFactor.devicePixelRatio,
    };

    // Get or create cached cloud
    const cachedCloud = getOrCreateCachedCanvas(
      caches.cloud,
      cacheKey,
      cacheDimensions,
      (canvas) => {
        const cacheCtx = canvas.getContext('2d');
        if (!cacheCtx) return;

        // Scale context for high-DPI rendering
        cacheCtx.scale(
          scaleFactor.devicePixelRatio,
          scaleFactor.devicePixelRatio,
        );

        // Set global alpha for cloud opacity
        cacheCtx.globalAlpha = cloud.opacity;

        // Draw cloud sprite
        cacheCtx.drawImage(
          tilesImage,
          ASSETS.COORDS.CLOUD.x,
          ASSETS.COORDS.CLOUD.y,
          ASSETS.COORDS.CLOUD.width,
          ASSETS.COORDS.CLOUD.height,
          0,
          0,
          roundedWidth / scaleFactor.devicePixelRatio, // Adjust for scaled context
          roundedHeight / scaleFactor.devicePixelRatio, // Adjust for scaled context
        );

        // Reset global alpha
        cacheCtx.globalAlpha = 1;
      },
      20, // Max cache size
    );

    // Draw the cached cloud at rounded position
    const roundedX = Math.round(cloud.x);
    const roundedY = Math.round(cloud.y);
    ctx.drawImage(
      cachedCloud,
      0,
      0,
      cachedCloud.width,
      cachedCloud.height,
      roundedX,
      roundedY,
      roundedWidth,
      roundedHeight,
    );
  });
};

// Wall rendering
const drawWalls = (
  ctx: CanvasRenderingContext2D,
  walls: Wall[],
  scaleFactor: ScaleFactor,
) => {
  const tilesImage = ASSETS.TILES;

  if (!tilesImage.complete) return;

  walls.forEach((wall) => {
    // Use rounded dimensions for cache key consistency and canvas creation
    const cacheKey = `${wall.isUpperWall ? 'upper' : 'lower'}_${Math.round(wall.width)}_${Math.round(wall.height)}`;
    const wallDimensions = {
      width: wall.width,
      height: wall.height,
    };

    // Get or create cached wall
    const cachedWall = getOrCreateCachedCanvas(
      caches.wall,
      cacheKey,
      wallDimensions, // Pass original potentially float dimensions
      (canvas) => {
        // canvas here has rounded dimensions from getOrCreateCachedCanvas
        const cacheCtx = canvas.getContext('2d');
        if (!cacheCtx) return;

        // Pass the canvas dimensions (which are rounded) to the drawing functions
        const roundedWallDims = { width: canvas.width, height: canvas.height };

        if (wall.isUpperWall) {
          drawUpperPipe(cacheCtx, roundedWallDims, tilesImage);
        } else {
          drawLowerPipe(cacheCtx, roundedWallDims, tilesImage);
        }
      },
      20, // Max cache size
    );

    // Draw the cached wall using rounded positions
    const wallXRounded = Math.round(wall.x);
    const wallYRounded = Math.round(wall.y);
    ctx.drawImage(cachedWall, wallXRounded, wallYRounded);

    // Draw debug hitbox if enabled
    if (DEBUG.SHOW_HITBOX) {
      const borderWidth = Math.max(1, Math.floor(2 * scaleFactor.widthScale));
      ctx.strokeStyle = DEBUG.HITBOX_COLOR;
      ctx.lineWidth = borderWidth;

      // --- START HITBOX ADJUSTMENT ---
      // Calculate dimensions needed for the two-part hitbox
      // Reuse logic similar to drawLowerPipe/drawUpperPipe

      const pipeCoords = ASSETS.COORDS.PIPE;
      const capCoords = wall.isUpperWall
        ? ASSETS.COORDS.PIPE_BOTTOM
        : ASSETS.COORDS.PIPE_TOP;

      // Use the actual cached wall dimensions (already rounded) for consistency
      const actualWallWidth = cachedWall.width;
      const actualWallHeight = cachedWall.height;

      const pipeWidthRatio = actualWallWidth / capCoords.width;
      const capHeight = Math.round(capCoords.height * pipeWidthRatio);
      const capWidth = actualWallWidth; // Cap uses the full width

      const bodyHeight = actualWallHeight - capHeight;
      const middleWidthRatio = pipeCoords.width / capCoords.width; // Ratio based on cap sprite
      const bodyWidth = Math.round(actualWallWidth * middleWidthRatio);
      const bodyXOffset = Math.round((actualWallWidth - bodyWidth) / 2); // Centered offset

      // Draw two rectangles for the hitbox
      if (wall.isUpperWall) {
        // Upper Pipe: Body first (top part), then Cap (bottom part)
        // Body Rect (starts at wall top, offsetted x)
        if (bodyHeight > 0) {
          ctx.strokeRect(
            wallXRounded + bodyXOffset,
            wallYRounded,
            bodyWidth,
            bodyHeight,
          );
        }
        // Cap Rect (starts after body, full width)
        ctx.strokeRect(
          wallXRounded,
          wallYRounded + bodyHeight,
          capWidth,
          capHeight,
        );
      } else {
        // Lower Pipe: Cap first (top part), then Body (bottom part)
        // Cap Rect (starts at wall top, full width)
        ctx.strokeRect(wallXRounded, wallYRounded, capWidth, capHeight);
        // Body Rect (starts after cap, offsetted x)
        if (bodyHeight > 0) {
          ctx.strokeRect(
            wallXRounded + bodyXOffset,
            wallYRounded + capHeight,
            bodyWidth,
            bodyHeight,
          );
        }
      }
      // --- END HITBOX ADJUSTMENT ---
    }
  });
};

// Draws onto the cache context (ctx)
const drawLowerPipe = (
  ctx: CanvasRenderingContext2D,
  wall: { width: number; height: number }, // Expects rounded dimensions from cache canvas
  tilesImage: HTMLImageElement,
) => {
  const pipeTopCoords = ASSETS.COORDS.PIPE_TOP;
  const pipeCoords = ASSETS.COORDS.PIPE;

  // wall.width and wall.height are already rounded integers (canvas dimensions)
  const wallWidth = wall.width;
  const wallHeight = wall.height;

  // Calculate scaling factors based on the rounded wallWidth
  const pipeWidthRatio = wallWidth / pipeTopCoords.width;
  const pipeTopHeight = Math.round(pipeTopCoords.height * pipeWidthRatio);

  // Draw pipe top cap (ensure source coords are integers)
  ctx.drawImage(
    tilesImage,
    pipeTopCoords.x, // Source X
    pipeTopCoords.y, // Source Y
    pipeTopCoords.width, // Source Width
    pipeTopCoords.height, // Source Height
    0, // Destination X on cache canvas
    0, // Destination Y on cache canvas
    wallWidth, // Destination Width (rounded)
    pipeTopHeight, // Destination Height (rounded)
  );

  // Draw pipe body (repeating middle section)
  const pipeBodyHeight = wallHeight - pipeTopHeight;
  if (pipeBodyHeight > 0) {
    // Calculate middle section width (slightly narrower) based on rounded wallWidth
    const middleWidthRatio = pipeCoords.width / pipeTopCoords.width; // Use top cap for ratio consistency
    const middleWidth = Math.round(wallWidth * middleWidthRatio);
    const xOffset = Math.round((wallWidth - middleWidth) / 2); // Center the narrower pipe body

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
        pipeCoords.x, // Source X
        pipeCoords.y, // Source Y
        pipeCoords.width, // Source Width
        sourceHeight, // Calculated Source Height (integer)
        xOffset, // Destination X (rounded)
        y, // Destination Y (rounded)
        middleWidth, // Destination Width (rounded)
        drawHeight, // Destination Height (rounded)
      );
    }
  }
};

// Draws onto the cache context (ctx)
const drawUpperPipe = (
  ctx: CanvasRenderingContext2D,
  wall: { width: number; height: number }, // Expects rounded dimensions from cache canvas
  tilesImage: HTMLImageElement,
) => {
  const pipeBottomCoords = ASSETS.COORDS.PIPE_BOTTOM;
  const pipeCoords = ASSETS.COORDS.PIPE;

  // wall.width and wall.height are already rounded integers (canvas dimensions)
  const wallWidth = wall.width;
  const wallHeight = wall.height;

  // Calculate scaling factors based on the rounded wallWidth
  const pipeWidthRatio = wallWidth / pipeBottomCoords.width;
  const pipeBottomHeight = Math.round(pipeBottomCoords.height * pipeWidthRatio);

  // Calculate middle section width (slightly narrower) based on rounded wallWidth
  const middleWidthRatio = pipeCoords.width / pipeBottomCoords.width; // Use bottom cap for ratio consistency
  const middleWidth = Math.round(wallWidth * middleWidthRatio);
  const xOffset = Math.round((wallWidth - middleWidth) / 2);

  // Draw pipe body (repeating middle section)
  const pipeBodyHeight = wallHeight - pipeBottomHeight;
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
        pipeCoords.x, // Source X
        pipeCoords.y, // Source Y
        pipeCoords.width, // Source Width
        sourceHeight, // Calculated Source Height (integer)
        xOffset, // Destination X (rounded)
        y, // Destination Y (rounded)
        middleWidth, // Destination Width (rounded)
        drawHeight, // Destination Height (rounded)
      );
    }
  }

  // Draw pipe bottom cap at the bottom of the upper pipe (ensure source coords are integers)
  ctx.drawImage(
    tilesImage,
    pipeBottomCoords.x, // Source X
    pipeBottomCoords.y, // Source Y
    pipeBottomCoords.width, // Source Width
    pipeBottomCoords.height, // Source Height
    0, // Destination X on cache canvas
    Math.round(wallHeight - pipeBottomHeight), // Destination Y (rounded)
    wallWidth, // Destination Width (rounded)
    pipeBottomHeight, // Destination Height (rounded)
  );
};

// Score rendering
const drawScore = (
  ctx: CanvasRenderingContext2D,
  score: number,
  scaleFactor: ScaleFactor,
) => {
  const { width } = ctx.canvas;
  // Round font size and padding for potentially sharper text rendering
  const fontSize = Math.max(
    16, // Minimum font size
    Math.round(TYPOGRAPHY.SCORE_FONT_SIZE * scaleFactor.heightScale),
  );
  const padding = Math.round(TYPOGRAPHY.SCORE_PADDING * scaleFactor.widthScale);
  // Use rounded fontSize in cache key
  const cacheKey = `${score}_${fontSize}_${Math.round(width)}`;

  // Estimate dimensions needed for the cache canvas
  const dimensions = {
    width: Math.round(width), // Use rounded width
    height: Math.round(fontSize * 1.5), // Use rounded font size for height estimate
  };

  // Get or create cached score
  const cachedScore = getOrCreateCachedCanvas(
    caches.score,
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

// Player rendering
const drawPlayer = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number, // This is the calculated (potentially float) desired width
  velocity: number,
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
  const cacheKey = `${roundedWidth}_${roundedHeight}_${velocity > 0 ? 'up' : 'normal'}`;

  const dimensions = { width: roundedWidth, height: roundedHeight };

  // Get or create cached player
  const cachedPlayer = getOrCreateCachedCanvas(
    caches.player,
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

// Main drawing function
const drawCanvas = ({
  ctx,
  yPos,
  walls,
  score,
  scaleFactor,
  velocity,
  wallSpeed,
  frameCount,
}: DrawProps) => {
  const canvas = ctx.canvas;
  // Calculate logical width/height based on DPR
  const logicalWidth = canvas.width / scaleFactor.devicePixelRatio;
  const logicalHeight = canvas.height / scaleFactor.devicePixelRatio;

  // Setup rendering context for the main canvas
  disableImageSmoothing(ctx);
  // Clear the entire canvas based on its actual pixel dimensions
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Apply scaling based on DPR for all subsequent drawing operations
  // This ensures drawing happens at the device's native resolution
  // Do this *once* after clearing and before drawing game elements.
  // Note: If you scale the context, all coordinates and dimensions drawn
  // afterwards should be in the *logical* coordinate space.
  // Let's reconsider if scaling the main context is the best approach here.
  // Given the caching strategy draws pre-scaled elements for DPR in the background cache,
  // and other elements are drawn based on logical sizes, it might be better *not*
  // to scale the main context globally, but ensure coordinates/sizes passed
  // to draw functions are logical, and the cache handles DPR scaling internally.
  // Let's stick to the previous approach: draw in logical coordinates, let caches handle DPR if needed.

  // Draw game elements in correct order (background to foreground)
  const backgroundSpeed = wallSpeed * BACKGROUND_SPEED_MULTIPLIER;
  // Pass logical width/height to drawing functions
  drawBackground(
    ctx,
    logicalWidth,
    logicalHeight,
    scaleFactor,
    backgroundSpeed,
  );

  generateClouds(logicalWidth, logicalHeight, scaleFactor);
  updateClouds(logicalWidth, logicalHeight, frameCount, wallSpeed, scaleFactor);

  // Draw clouds between background and walls
  drawClouds(ctx, scaleFactor);

  drawWalls(ctx, walls, scaleFactor); // drawWalls uses logical coords, cache handles internal scaling
  drawScore(ctx, score, scaleFactor); // drawScore uses logical coords

  // Calculate player dimensions in logical space
  const playerWidth = logicalWidth * PLAYER_WIDTH_PERCENT;
  const playerX = logicalWidth * PLAYER_X_POS_MULTIPLIER;
  // yPos is already in logical space
  drawPlayer(ctx, playerX, yPos, playerWidth, velocity); // drawPlayer uses logical coords
};

export const CanvasDrawService = {
  drawCanvas,
  clearCache,
};
