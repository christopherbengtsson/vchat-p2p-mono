import { useCallback, useEffect, useRef } from 'react';
import { observer } from 'mobx-react';
import { Canvas } from '../component/Canvas';
import { useCanvasAnimate } from '../hooks/useCanvasAnimate';
import { useCanvasResize } from '../hooks/useCanvasResize';
import { FlappyTrumpService } from '../service/FlappyTrumpService';
import { RandomTrumpSound } from '../component/RandomTrumpSound';

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

  const getPitch = useCallback(() => FlappyTrumpService.getPitch(), []);

  const onGameOver = useCallback(
    async (score: number) => {
      const endRound = () => onEndRound(score);
      await playEndSound(endRound);
    },
    [onEndRound],
  );

  const scaleFactor = useCanvasResize(canvasRef, containerRef);
  useCanvasAnimate({
    canvasRef,
    onGameOver,
    getPitch,
    scaleFactor,
  });

  useEffect(() => {
    FlappyTrumpService.startCanvasStream(canvasRef.current);

    return () => {
      FlappyTrumpService.stopCanvasStream();
    };
  }, []);

  const playStartSound = async () => {
    void startAudioRef.current?.play();
  };

  const playEndSound = async (endRound: VoidFunction) => {
    if (!endAudioRef.current) {
      return endRound();
    }

    endAudioRef.current.onended = () => {
      endRound();
    };
    await endAudioRef.current?.play();
  };

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

      <RandomTrumpSound
        ref={startAudioRef}
        type="start"
        onReady={playStartSound}
      />
      <RandomTrumpSound ref={endAudioRef} type="end" />
    </>
  );
});
