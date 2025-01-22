import { useCallback } from 'react';
import { DrawProps } from '../model/DrawProps';
import {
  CORNER_POINTS,
  DEBUG_LINE_WIDTH,
  DEBUG_STYLE,
  PLANE_CENTER_OFFSET,
  PLANE_CENTER_OFFSET_Y,
  PLANE_HEIGHT,
  PLANE_WIDTH,
  PLANE_X,
  planeImage,
  SCORE_FONT,
  SCORE_STYLE,
  WALL_STYLE,
} from '../model/CanvasConstants';
import { CanvasBallService } from '../service/CanvasBallService';

export const useCanvasDraw = () => {
  const draw = useCallback(
    ({ ctx, yPos, walls, score, velocity }: DrawProps) => {
      const canvas = ctx.canvas;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Save the current context state
      ctx.save();

      // Move to the plane's position
      const centerX = PLANE_X + PLANE_CENTER_OFFSET;
      const centerY = yPos + PLANE_CENTER_OFFSET_Y;

      // Translate to the center of where the plane will be
      ctx.translate(centerX, centerY);
      // Rotate based on velocity
      const rotation = CanvasBallService.calculateRotation(velocity);
      ctx.rotate(rotation);

      // Draw the plane centered at origin

      ctx.drawImage(
        planeImage,
        -PLANE_WIDTH / 2,
        -PLANE_HEIGHT / 2,
        PLANE_WIDTH,
        PLANE_HEIGHT,
      );

      if (import.meta.env.DEV) {
        // Debug lines for collision detection

        // Draw collision lines
        ctx.strokeStyle = DEBUG_STYLE;
        ctx.lineWidth = DEBUG_LINE_WIDTH;

        // Draw all lines in one continuous path
        ctx.beginPath();
        ctx.moveTo(CORNER_POINTS[0].x, CORNER_POINTS[0].y);
        CORNER_POINTS.slice(1).forEach((point) => {
          ctx.lineTo(point.x, point.y);
        });
        ctx.closePath();
        ctx.stroke();

        // Draw corner points
        ctx.fillStyle = DEBUG_STYLE;
        CORNER_POINTS.forEach((point) => {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.closePath();
        });
      }

      // Restore the context to its original state
      ctx.restore();

      // Draw walls
      walls.forEach((wall) => {
        ctx.fillStyle = WALL_STYLE;
        ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
      });

      // Draw score
      ctx.font = SCORE_FONT;
      ctx.fillStyle = SCORE_STYLE;
      ctx.fillText(`Score: ${score}`, 10, 30);
    },
    [],
  );

  return draw;
};
