import { useCallback } from 'react';
import { Wall } from '../model/Wall';
import { BALL_RADIUS } from '../service/CanvasService';

export const useCanvasDraw = () => {
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, volume: number, walls: Wall[]) => {
      const canvas = ctx.canvas;
      const minY = BALL_RADIUS;
      const maxY = canvas.height - BALL_RADIUS;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Map volume to vertical position
      const clampedVolume = Math.min(Math.max(volume, 0), 1);
      const y = maxY - clampedVolume * (maxY - minY);

      // Draw the ball
      const ballX = BALL_RADIUS * 5;
      ctx.beginPath();
      ctx.arc(ballX, y, BALL_RADIUS, 0, 2 * Math.PI);
      ctx.fillStyle = '#1E3A8A'; // Tailwind CSS blue-900
      ctx.fill();
      ctx.closePath();

      // Draw walls
      walls.forEach((wall) => {
        ctx.fillStyle = '#DC2626'; // Tailwind CSS red-600

        ctx.fillRect(
          wall.x,
          canvas.height - wall.gapHeight,
          wall.width,
          wall.gapHeight,
        );
      });
    },
    [],
  );

  return draw;
};
