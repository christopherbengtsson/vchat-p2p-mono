import { useCallback, useEffect, useRef } from 'react';
import { observer } from 'mobx-react';
import { Canvas } from '../component/Canvas';
import { useCanvasAnimate } from '../hooks/useCanvasAnimate';
import { useCanvasResize } from '../hooks/useCanvasResize';
import { FlappyBirdService } from '../service/FlappyBirdService';

interface Props {
  onEndRound: (score: number) => void;
}

export const PlayerContainer = observer(function PlayerContainer({
  onEndRound,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getPitch = useCallback(() => FlappyBirdService.getPitch(), []);

  const onGameOver = useCallback(
    (score: number) => {
      onEndRound(score);
    },
    [onEndRound],
  );

  const scaleFactor = useCanvasResize(canvasRef, containerRef);
  useCanvasAnimate({ canvasRef, onGameOver, getPitch, scaleFactor });

  useEffect(() => {
    FlappyBirdService.startCanvasStream(canvasRef.current);

    return () => {
      FlappyBirdService.stopCanvasStream();
    };
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        className="absolute w-full h-full z-40 touch-none select-none"
        aria-label="Game area"
      >
        <div className="relative z-10">
          <Canvas canvasRef={canvasRef} />
        </div>
      </div>

      <div className="absolute top-0 left-0 w-full h-full bg-black opacity-80" />
    </>
  );
});
