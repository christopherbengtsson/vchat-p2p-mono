import { useRef } from 'react';
import { Canvas } from '../component/Canvas';
import { useCanvasDraw } from '../hooks/useCanvasDraw';
import { useCanvasAnimate } from '../hooks/useCanvasAnimate';

export function CanvasContainer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draw = useCanvasDraw();
  useCanvasAnimate({ canvasRef, draw });

  return <Canvas canvasRef={canvasRef} />;
}
