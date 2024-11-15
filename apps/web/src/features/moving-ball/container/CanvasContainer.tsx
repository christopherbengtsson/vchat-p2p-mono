import { useEffect, useRef } from 'react';
import { observer } from 'mobx-react';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { Canvas } from '../component/Canvas';
import { useCanvasDraw } from '../hooks/useCanvasDraw';
import { useCanvasAnimate } from '../hooks/useCanvasAnimate';
import { GAME_HEIGHT, GAME_WIDTH } from '../service/CanvasService';

export const CanvasContainer = observer(function CanvasContainer() {
  const { callStore } = useRootStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const draw = useCanvasDraw();
  useCanvasAnimate({ canvasRef, draw });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const handleResize = () => {
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
    handleResize(); // Initial size

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    callStore.sendCanvasStream(canvasRef.current?.captureStream(30)); // TODO: Choose FPS based on network speed?
  }, [callStore]);

  return (
    <div className="absolute top-0 left-0 w-full h-full">
      <div
        ref={containerRef}
        className="relative w-full h-full flex justify-center items-center"
      >
        <Canvas canvasRef={canvasRef} />
      </div>
    </div>
  );
});
