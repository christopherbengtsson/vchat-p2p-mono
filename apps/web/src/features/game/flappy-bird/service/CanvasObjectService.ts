import {
  GRAVITY,
  PLAYER_WIDTH_PERCENT,
  SMOOTHING_FACTOR,
} from '../model/CanvasConstants';
import { ScaleFactor } from '../model/DrawProps';
import { AudioFrequencyService } from './AudioFrequencyService';

const setObjectPosition = (
  [pitch, clarity]: [number, number],
  canvas: HTMLCanvasElement,
  objectYRef: React.RefObject<number>,
  velocityRef: React.RefObject<number>,
  scaleFactor: ScaleFactor,
) => {
  let voiceInputDetected = false;
  const scaledGravity = GRAVITY * scaleFactor.heightScale;

  if (
    pitch > AudioFrequencyService.PITCH_THRESHOLD &&
    clarity > AudioFrequencyService.CLARITY_THRESHOLD
  ) {
    voiceInputDetected = true;

    // Map the pitch to a Y position on the canvas
    const normalizedPitch =
      Math.min(pitch, AudioFrequencyService.MAX_FREQUENCY) /
      AudioFrequencyService.MAX_FREQUENCY;
    const targetY =
      (1 - normalizedPitch) * (canvas.height / scaleFactor.devicePixelRatio);

    // Calculate velocity based on position change
    const previousY = objectYRef.current;
    objectYRef.current =
      objectYRef.current + (targetY - objectYRef.current) * SMOOTHING_FACTOR;

    // Update velocity based on movement direction
    velocityRef.current = (objectYRef.current - previousY) / 5; // Divide by 5 to dampen effect
  }

  if (!voiceInputDetected) {
    // Apply gravity to make the player fall
    velocityRef.current += scaledGravity;
    objectYRef.current += velocityRef.current;
  }
};

const setObjectBoundaries = (
  playerYRef: React.RefObject<number>,
  canvas: HTMLCanvasElement,
  velocityRef: React.RefObject<number>,
  scaleFactor: ScaleFactor, // Make sure to pass this from useCanvasAnimate
) => {
  // Calculate logical canvas dimensions (removing device pixel ratio)
  const canvasWidth = canvas.width / scaleFactor.devicePixelRatio;
  const canvasHeight = canvas.height / scaleFactor.devicePixelRatio;

  // Use width-based size for consistent square player
  const playerSize = canvasWidth * PLAYER_WIDTH_PERCENT;

  // Prevent the player from going above the canvas
  if (playerYRef.current < 0) {
    playerYRef.current = 0;
    velocityRef.current = 0;
  }

  // Prevent the player from falling below the canvas
  const maxY = canvasHeight - playerSize;
  if (playerYRef.current > maxY) {
    playerYRef.current = maxY;
    velocityRef.current = 0;
  }
};

export const CanvasObjectService = {
  setObjectPosition,
  setObjectBoundaries,
};
