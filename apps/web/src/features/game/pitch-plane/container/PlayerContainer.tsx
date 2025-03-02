import { useCallback, useEffect, useRef } from 'react';
import { observer } from 'mobx-react';
import { Canvas } from '../component/Canvas';
import { useCanvasDraw } from '../hooks/useCanvasDraw';
import { useCanvasAnimate } from '../hooks/useCanvasAnimate';
import { useCanvasResize } from '../hooks/useCanvasResize';
import { GameRoundService } from '../service/GameRoundService';

interface Props {
  onEndRound: (score: number) => void;
}

export const PlayerContainer = observer(function PlayerContainer({
  onEndRound,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = useCanvasDraw();

  const getPitch = useCallback(() => GameRoundService.getPitch(), []);

  const onGameOver = useCallback(
    (score: number) => {
      onEndRound(score);
    },
    [onEndRound],
  );

  useCanvasResize(canvasRef, containerRef);
  useCanvasAnimate({ canvasRef, draw, onGameOver, getPitch });

  useEffect(() => {
    GameRoundService.startCanvasStream(canvasRef.current);

    return () => {
      GameRoundService.stopCanvasStream();
    };
  }, []);

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
