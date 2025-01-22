import PaperPlane from '@/assets/paper_plane.svg';

/** Gap between top and bottom walls */
export const WALL_GAP = 200;
export const WALL_WIDTH = 40;

/** Speed at which walls move towards the ball */
export const WALL_SPEED = 2;
/** Gap (frames) between walls */
export const WALL_FREQUENCY = 150;

/** Physics */
export const GRAVITY = 0.05;
/** Dont make it too sensitive to pitch changes */
export const SMOOTHING_FACTOR = 0.02;

/** PaperPlane */
export const planeImage = new Image();
planeImage.src = PaperPlane;
const PLANE_SVG_WIDTH = 200;
const PLANE_SVG_HEIGHT = 113;
export const PLANE_WIDTH = 100; // Base width
export const PLANE_HEIGHT = Math.floor(
  PLANE_WIDTH / (PLANE_SVG_WIDTH / PLANE_SVG_HEIGHT),
); // maintain ratio
export const PLANE_X_POS_MULTIPLIER = 3;
export const PLANE_X = PLANE_WIDTH * PLANE_X_POS_MULTIPLIER;
export const PLANE_CENTER_OFFSET = PLANE_WIDTH / 2;
export const PLANE_CENTER_OFFSET_Y = PLANE_HEIGHT / 2;
// Plane boundaries, for debugging
export const CORNER_POINTS = [
  { x: 468.5 - 1234 / 2, y: 0 - 695 / 2 }, // left wing tip
  { x: 0 - 1234 / 2, y: 602 - 695 / 2 }, // right wing tip
  { x: 277.5 - 1234 / 2, y: 695 - 695 / 2 }, // Tail tip
  { x: 1234 - 1234 / 2, y: 431 - 695 / 2 }, // Nose tip
].map((point) => ({
  x: (point.x / 1234) * PLANE_WIDTH,
  y: (point.y / 695) * PLANE_HEIGHT,
}));

// Canvas styles
export const WALL_STYLE = '#DC2626';
export const SCORE_STYLE = 'white';
export const SCORE_FONT = '24px Arial';
export const DEBUG_STYLE = '#22C55E';
export const DEBUG_LINE_WIDTH = 2;
