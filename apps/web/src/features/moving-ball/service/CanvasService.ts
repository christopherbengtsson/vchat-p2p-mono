/** Dont make it too sensitive to volume changes */
export const SMOOTHING_FRAMES = 35;
/** Cancel out small noises */
export const VOLUME_THRESHOLD = 0.1;
/** Scale volume relative to canvas height (both are ~0-1) */
export const VOLUME_SCALE = 1.5;

/** Ball size */
export const BALL_RADIUS = 20;
/** Speed at which walls move towards the ball */
export const WALL_SPEED = 2;
/** Gap (frames) between walls */
export const WALL_FREQUENCY = 150;

/** Physics */
export const GRAVITY = 0.08;
export const JUMP_STRENGTH = -10;
