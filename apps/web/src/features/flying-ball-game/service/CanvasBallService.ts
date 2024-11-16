import { BALL_RADIUS, GRAVITY, JUMP_STRENGTH } from '../model/CanvasConstants';

// If volume is above the threshold, the ball jumps up
const setBallVelocity = (
  smoothedVolume: number,
  velocityRef: React.MutableRefObject<number>,
) => {
  if (smoothedVolume > 0) {
    velocityRef.current = JUMP_STRENGTH * smoothedVolume;
  } else {
    // Apply gravity when volume is low
    velocityRef.current += GRAVITY;
  }
};

// Update ball position based on velocity
const updateBallPositionByVelocity = (
  smoothedVolume: number,
  velocityRef: React.MutableRefObject<number>,
  ballYRef: React.MutableRefObject<number>,
) => {
  setBallVelocity(smoothedVolume, velocityRef);

  ballYRef.current += velocityRef.current;
};

const setBallBoundaries = (
  ballYRef: React.MutableRefObject<number>,
  canvas: HTMLCanvasElement,
  velocityRef: React.MutableRefObject<number>,
) => {
  // TODO: Or maybe we want that?
  // Prevent the ball from going above the canvas
  if (ballYRef.current < BALL_RADIUS) {
    ballYRef.current = BALL_RADIUS;
    velocityRef.current = 0;
  }

  // Prevent the ball from falling below the canvas
  const maxY = canvas.height - BALL_RADIUS;
  if (ballYRef.current > maxY) {
    ballYRef.current = maxY;
    velocityRef.current = 0;
  }
};

export const CanvasBallService = {
  updateBallPositionByVelocity,
  setBallBoundaries,
};
