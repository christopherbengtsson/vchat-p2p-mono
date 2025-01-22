import {
  GRAVITY,
  PLANE_HEIGHT,
  SMOOTHING_FACTOR,
} from '../model/CanvasConstants';
import { AudioFrequencyService } from './AudioFrequencyService';

const calculateRotation = (velocity: number) => {
  // Convert velocity to rotation angle in radians
  // Clamp the rotation between -30 and +30 degrees (converted to radians)
  const maxRotation = (30 * Math.PI) / 180;
  return Math.max(-maxRotation, Math.min(maxRotation, velocity * 2));
};

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

    // Calculate velocity based on position change
    const previousY = ballYRef.current;
    ballYRef.current =
      ballYRef.current + (targetY - ballYRef.current) * SMOOTHING_FACTOR;

    // Update velocity based on movement direction
    velocityRef.current = (ballYRef.current - previousY) / 5; // Divide by 5 to dampen the effect
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
  calculateRotation,
};
