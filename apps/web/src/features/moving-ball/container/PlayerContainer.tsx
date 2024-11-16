import { useEffect, useRef } from 'react';
import { observer } from 'mobx-react';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { Canvas } from '../component/Canvas';
import { useCanvasDraw } from '../hooks/useCanvasDraw';
import { useCanvasAnimate } from '../hooks/useCanvasAnimate';
import { useCanvasResize } from '../hooks/useCanvasResize';

export const PlayerContainer = observer(function PlayerContainer() {
  const { callStore } = useRootStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = useCanvasDraw();

  useCanvasResize(canvasRef, containerRef);
  useCanvasAnimate({ canvasRef, draw });

  useEffect(() => {
    callStore.sendCanvasStream(canvasRef.current?.captureStream(30));
  }, [callStore]);

  return (
    <>
      <div ref={containerRef} className="absolute w-4/5 h-4/5 z-40">
        <div className="relative flex justify-center z-10">
          <Canvas canvasRef={canvasRef} />
        </div>
      </div>

      <div className="absolute top-0 left-0 w-full h-full bg-black opacity-80" />
    </>
  );
});
