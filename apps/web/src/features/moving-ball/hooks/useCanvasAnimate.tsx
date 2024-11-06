import { useEffect, useRef, useCallback } from 'react';
import { AudioAnalyserService } from '../service/AudioAnalyserService';

interface In {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  draw: (ctx: CanvasRenderingContext2D, volume: number) => void;
}

export const useCanvasAnimate = ({ canvasRef, draw }: In) => {
  const requestRef = useRef<number>();
  const previousVolumeRef = useRef<number>(0);
  const smoothingFactor = 0.8; // Adjust between 0-1

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newVolume = AudioAnalyserService.getVolume();

    const smoothedVolume =
      smoothingFactor * previousVolumeRef.current +
      (1 - smoothingFactor) * newVolume;
    previousVolumeRef.current = smoothedVolume;

    draw(ctx, smoothedVolume);

    requestRef.current = requestAnimationFrame(animate);
  }, [canvasRef, draw, smoothingFactor]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [animate]);
};
