import { useEffect } from 'react';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  setGameDimensions,
} from '../service/CanvasService';

export const useCanvasResize = (
  canvasRef: React.RefObject<HTMLCanvasElement>,
  containerRef: React.RefObject<HTMLDivElement>,
) => {
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const handleResize = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      setGameDimensions(isPortrait);

      const scale = Math.min(
        container.clientWidth / GAME_WIDTH,
        container.clientHeight / GAME_HEIGHT,
      );

      canvas.width = GAME_WIDTH;
      canvas.height = GAME_HEIGHT;
      canvas.style.width = `${GAME_WIDTH * scale}px`;
      canvas.style.height = `${GAME_HEIGHT * scale}px`;
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    handleResize();

    return () => resizeObserver.disconnect();
  }, [canvasRef, containerRef]);
};
