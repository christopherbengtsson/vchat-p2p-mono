import { useCallback } from 'react';

export const useCanvasDraw = () => {
  const draw = useCallback((ctx: CanvasRenderingContext2D, volume: number) => {
    const canvas = ctx.canvas;
    const maxRadius = 20;
    const minY = maxRadius;
    const maxY = canvas.height - maxRadius;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Map volume to vertical position
    const clampedVolume = Math.min(Math.max(volume, 0), 1);
    const y = maxY - clampedVolume * (maxY - minY);

    // Draw the ball
    ctx.beginPath();
    ctx.arc(canvas.width / 2, y, maxRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#1E3A8A'; // Tailwind CSS blue-900
    ctx.fill();
    ctx.closePath();
  }, []);

  return draw;
};
