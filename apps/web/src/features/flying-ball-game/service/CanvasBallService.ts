import {
  GRAVITY,
  PLANE_HEIGHT,
  SMOOTHING_FACTOR,
} from '../model/CanvasConstants';
import { AudioFrequencyService } from './AudioFrequencyService';

const setBallPosition = (
  [pitch, clarity]: [number, number],
  canvas: HTMLCanvasElement,
  ballYRef: React.MutableRefObject<number>,
  velocityRef: React.MutableRefObject<number>,
) => {
  let voiceInputDetected = false;

  if (
    pitch > AudioFrequencyService.PITCH_THRESHOLD &&
    clarity > AudioFrequencyService.CLARITY_THRESHOLD
  ) {
    voiceInputDetected = true;

    // Map the pitch to a Y position on the canvas
    const normalizedPitch =
      Math.min(pitch, AudioFrequencyService.MAX_FREQUENCY) /
      AudioFrequencyService.MAX_FREQUENCY;
    const targetY = (1 - normalizedPitch) * canvas.height;

    // Smoothly move the ball towards the Y position
    ballYRef.current =
      ballYRef.current + (targetY - ballYRef.current) * SMOOTHING_FACTOR;

    // Reset velocity so gravity doesn't affect the ball when voice input is present
    velocityRef.current = 0;
  }

  if (!voiceInputDetected) {
    // Apply gravity to make the ball fall slowly
    velocityRef.current += GRAVITY;
    ballYRef.current += velocityRef.current;
  }
};

const setPlaneBoundaries = (
  planeYRef: React.MutableRefObject<number>,
  canvas: HTMLCanvasElement,
  velocityRef: React.MutableRefObject<number>,
) => {
  // Prevent the plane from going above the canvas
  if (planeYRef.current < 0) {
    planeYRef.current = 0;
    velocityRef.current = 0;
  }

  // Prevent the plane from falling below the canvas
  const maxY = canvas.height - PLANE_HEIGHT;
  if (planeYRef.current > maxY) {
    planeYRef.current = maxY;
    velocityRef.current = 0;
  }
};

export const CanvasBallService = {
  setBallPosition,
  setPlaneBoundaries,
};
