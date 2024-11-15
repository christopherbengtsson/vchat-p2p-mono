import { useCallback } from 'react';
import { Wall } from '../model/Wall';
import { BALL_RADIUS } from '../service/CanvasService';

export const useCanvasDraw = () => {
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, yPos: number, walls: Wall[]) => {
      const canvas = ctx.canvas;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw the ball
      const ballX = BALL_RADIUS * 5;
      const y = yPos; // Use the provided yPos

      ctx.beginPath();
      ctx.arc(ballX, y, BALL_RADIUS, 0, 2 * Math.PI);
      ctx.fillStyle = '#1E3A8A'; // Tailwind CSS blue-900
      ctx.fill();
      ctx.closePath();

      // Draw walls
      walls.forEach((wall) => {
        ctx.fillStyle = '#DC2626'; // Tailwind CSS red-600

        ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
      });
    },
    [],
  );

  return draw;
};
