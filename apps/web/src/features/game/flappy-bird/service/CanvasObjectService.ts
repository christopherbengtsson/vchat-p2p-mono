import {
  GRAVITY,
  PLAYER_WIDTH_PERCENT,
  SMOOTHING_FACTOR,
} from '../model/CanvasConstants';
import { ScaleFactor } from '../model/DrawProps';
import { AudioFrequencyService } from './AudioFrequencyService';

const updateObjectPosition = (
  [pitch, clarity]: [number, number],
  canvas: HTMLCanvasElement,
  objectYRef: React.RefObject<number>,
  velocityRef: React.RefObject<number>,
  scaleFactor: ScaleFactor,
) => {
  // Calculate logical canvas dimensions (removing device pixel ratio) - do once
  const canvasWidth = canvas.width / scaleFactor.devicePixelRatio;
  const canvasHeight = canvas.height / scaleFactor.devicePixelRatio;
  const playerSize = canvasWidth * PLAYER_WIDTH_PERCENT;
  const maxY = canvasHeight - playerSize;
  const scaledGravity = GRAVITY * scaleFactor.heightScale;

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
    const targetY = (1 - normalizedPitch) * canvasHeight;

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

  // Apply boundaries in the same function
  // Prevent the player from going above the canvas
  if (objectYRef.current < 0) {
    objectYRef.current = 0;
    velocityRef.current = 0;
  }

  // Prevent the player from falling below the canvas
  if (objectYRef.current > maxY) {
    objectYRef.current = maxY;
    velocityRef.current = 0;
  }

  return voiceInputDetected;
};

export const CanvasObjectService = {
  updateObjectPosition,
};
