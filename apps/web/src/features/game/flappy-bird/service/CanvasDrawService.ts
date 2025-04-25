import {
  COLORS,
  PLAYER_WIDTH_PERCENT,
  TYPOGRAPHY,
  DEBUG,
  PLAYER_X_POS_MULTIPLIER,
} from '../model/CanvasConstants';
import { DrawProps } from '../model/DrawProps';

const drawBackground = (ctx: CanvasRenderingContext2D) => {
  const { width, height } = ctx.canvas;
  ctx.fillStyle = COLORS.BACKGROUND;
  ctx.fillRect(0, 0, width, height);
};

const drawWalls = (
  ctx: CanvasRenderingContext2D,
  walls: DrawProps['walls'],
  scaleFactor: DrawProps['scaleFactor'],
) => {
  ctx.fillStyle = COLORS.WALL;

  // We can use the scale factor for visual enhancements
  // For example, add a subtle border that scales properly with screen size
  const borderWidth = Math.max(1, Math.floor(2 * scaleFactor.widthScale));

  walls.forEach((wall) => {
    // Draw the main wall
    ctx.fillRect(wall.x, wall.y, wall.width, wall.height);

    // Add a slightly darker border for visual depth
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
  });
};

const drawScore = (
  ctx: CanvasRenderingContext2D,
  score: number,
  scaleFactor: DrawProps['scaleFactor'],
) => {
  const fontSize = Math.max(
    16,
    Math.round(TYPOGRAPHY.SCORE_FONT_SIZE * scaleFactor.heightScale),
  );
  const padding = Math.round(TYPOGRAPHY.SCORE_PADDING * scaleFactor.widthScale);

  ctx.font = `bold ${fontSize}px ${TYPOGRAPHY.SCORE_FONT_FAMILY}`;
  ctx.fillStyle = COLORS.SCORE;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Add shadow for better visibility
  ctx.shadowColor = COLORS.SCORE_SHADOW;
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  ctx.fillText(`Score: ${score}`, padding, padding);

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
};

const drawPlayer = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
) => {
  const size = width;

  ctx.fillStyle = COLORS.PLAYER;
  ctx.fillRect(x, y, size, size);

  // Add debug hitbox if enabled
  if (DEBUG.SHOW_HITBOX) {
    ctx.strokeStyle = DEBUG.HITBOX_COLOR;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, size, size);
  }
};

const drawCanvas = ({ ctx, yPos, walls, score, scaleFactor }: DrawProps) => {
  const canvas = ctx.canvas;
  const width = canvas.width / scaleFactor.devicePixelRatio;
  const height = canvas.height / scaleFactor.devicePixelRatio;

  ctx.clearRect(0, 0, width, height);

  // Draw background
  drawBackground(ctx);

  // Draw walls
  drawWalls(ctx, walls, scaleFactor);

  // Draw score
  drawScore(ctx, score, scaleFactor);

  // Calculate player dimensions based on canvas size and percentages
  const playerWidth = width * PLAYER_WIDTH_PERCENT;
  const playerX = width * PLAYER_X_POS_MULTIPLIER;

  // Draw player (yellow square)
  drawPlayer(ctx, playerX, yPos, playerWidth);
};

export const CanvasDrawService = {
  drawCanvas,
};
