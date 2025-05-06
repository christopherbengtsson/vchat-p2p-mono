import { useCallback, useEffect, useRef } from 'react';
import { observer } from 'mobx-react';
import { Canvas } from '../component/Canvas';
import { useCanvasAnimate } from '../hooks/useCanvasAnimate';
import { useCanvasResize } from '../hooks/useCanvasResize';
import { PutinsPuppetService } from '../service/PutinsPuppetService';
import { RandomTrumpSound } from '../component/RandomTrumpSound';
import { GameTitle } from '../component/GameTitle';

interface Props {
  onEndRound: (score: number) => void;
}

export const PlayerContainer = observer(function PlayerContainer({
  onEndRound,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startAudioRef = useRef<HTMLAudioElement>(null);
  const endAudioRef = useRef<HTMLAudioElement>(null);

  const getPitch = useCallback(() => PutinsPuppetService.getPitch(), []);

  const playStartSound = async () => {
    startAudioRef.current?.play();
  };

  const onGameOver = useCallback(
    (score: number) => {
      onEndRound(score);
    },
    [onEndRound],
  );

  const scaleFactor = useCanvasResize(canvasRef, containerRef);
  useCanvasAnimate({
    canvasRef,
    onGameOver,
    getPitch,
    scaleFactor,
    endAudioRef,
  });

  useEffect(() => {
    PutinsPuppetService.startCanvasStream(canvasRef.current);

    return () => {
      PutinsPuppetService.stopCanvasStream();
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
          <GameTitle />
          <Canvas canvasRef={canvasRef} />
        </div>
      </div>

      <div className="absolute top-0 left-0 w-full h-full bg-black opacity-80" />

      <RandomTrumpSound
        ref={startAudioRef}
        type="start"
        onReady={playStartSound}
      />
      <RandomTrumpSound ref={endAudioRef} type="end" />
    </>
  );
});
