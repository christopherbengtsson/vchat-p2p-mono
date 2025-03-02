import { useEffect } from 'react';

export const useCanvasResize = (
  canvasRef: React.RefObject<HTMLCanvasElement>,
  containerRef: React.RefObject<HTMLDivElement>,
) => {
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const handleResize = () => {
      const { clientWidth: width, clientHeight: height } = container;

      canvas.width = width;
      canvas.height = height;

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    handleResize();

    return () => {
      resizeObserver.disconnect();
    };
  }, [canvasRef, containerRef]);
};
