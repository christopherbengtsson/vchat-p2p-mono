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

const PLANE_SVG_WIDTH = 200;
const PLANE_SVG_HEIGHT = 113;

export const PLANE_WIDTH = 100; // Base width
export const PLANE_HEIGHT = Math.floor(
  PLANE_WIDTH / (PLANE_SVG_WIDTH / PLANE_SVG_HEIGHT),
); // maintain ratio
export const PLANE_X_POS_MULTIPLIER = 3;
