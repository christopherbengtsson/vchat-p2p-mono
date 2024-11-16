import { useCallback } from 'react';
import { BALL_RADIUS, BALL_X_POS_MULTIPLIER } from '../service/CanvasService';
import { DrawProps } from '../model/DrawProps';

export const useCanvasDraw = () => {
  const draw = useCallback(({ ctx, yPos, walls, score }: DrawProps) => {
    const canvas = ctx.canvas;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the ball
    const ballX = BALL_RADIUS * BALL_X_POS_MULTIPLIER;
    const y = yPos;

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

    // Draw score
    ctx.font = '24px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText(`Score: ${score}`, 10, 30);
  }, []);

  return draw;
};
