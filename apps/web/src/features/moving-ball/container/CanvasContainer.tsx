import { useEffect, useRef } from 'react';
import { observer } from 'mobx-react';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { Canvas } from '../component/Canvas';
import { useCanvasDraw } from '../hooks/useCanvasDraw';
import { useCanvasAnimate } from '../hooks/useCanvasAnimate';

export const CanvasContainer = observer(function CanvasContainer() {
  const { callStore } = useRootStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draw = useCanvasDraw();
  useCanvasAnimate({ canvasRef, draw });

  useEffect(() => {
    callStore.sendCanvasStream(canvasRef.current?.captureStream(30));
  }, [callStore]);

  return (
    <div className="absolute top-0 left-0 w-full h-full">
      <div className="relative w-full h-full flex justify-center items-center">
        <Canvas canvasRef={canvasRef} />
      </div>
    </div>
  );
});
