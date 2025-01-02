import { useCallback } from 'react';
import PaperPlane from '@/assets/paper_plane.svg';
import { DrawProps } from '../model/DrawProps';
import {
  PLANE_HEIGHT,
  PLANE_WIDTH,
  PLANE_X_POS_MULTIPLIER,
} from '../model/CanvasConstants';

export const useCanvasDraw = () => {
  const draw = useCallback(({ ctx, yPos, walls, score }: DrawProps) => {
    const canvas = ctx.canvas;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const planeX = PLANE_WIDTH * PLANE_X_POS_MULTIPLIER;
    const planeY = yPos;

    const paperPlane = new Image();
    paperPlane.src = PaperPlane;
    ctx.drawImage(paperPlane, planeX, planeY, PLANE_WIDTH, PLANE_HEIGHT);

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
