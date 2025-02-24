import { useCallback, useEffect, useRef } from 'react';
import { observer } from 'mobx-react';
import { Canvas } from '../component/Canvas';
import { useCanvasDraw } from '../hooks/useCanvasDraw';
import { useCanvasAnimate } from '../hooks/useCanvasAnimate';
import { useCanvasResize } from '../hooks/useCanvasResize';
import { useCallStore } from '../../call/context/useCallStore';

export const PlayerContainer = observer(function PlayerContainer() {
  const { gameStore } = useCallStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = useCanvasDraw();

  const getPitch = useCallback(
    () => gameStore.audioFrequencyService?.getPitch(),
    [gameStore.audioFrequencyService],
  );

  const onGameOver = (score: number) => {
    gameStore.roundGameOver(score);
  };

  useCanvasResize(canvasRef, containerRef);
  useCanvasAnimate({ canvasRef, draw, onGameOver, getPitch });

  useEffect(() => {
    gameStore.sendCanvasStream(canvasRef.current?.captureStream(30));
  }, [gameStore]);

  return (
    <>
      <div ref={containerRef} className="absolute w-full h-full z-40">
        <div className="relative z-10">
          <Canvas canvasRef={canvasRef} />
        </div>
      </div>

      <div className="absolute top-0 left-0 w-full h-full bg-black opacity-80" />
    </>
  );
});
