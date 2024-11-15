/** Base game dimensions (virtual canvas size) */
export const GAME_WIDTH = 900;
export const GAME_HEIGHT = 600;

/** Dont make it too sensitive to volume changes */
export const SMOOTHING_FRAMES = 35;
/** Cancel out small noises */
export const VOLUME_THRESHOLD = 0.1;
/** Scale volume relative to canvas height (both are ~0-1) */
export const VOLUME_SCALE = 1.5;

/** Ball size */
export const BALL_RADIUS = GAME_WIDTH * 0.022; // 20px at base width

/** Walls */

/** Gap between top and bottom walls */
export const WALL_GAP = GAME_HEIGHT * 0.25; // 150px at base height
export const WALL_WIDTH = GAME_WIDTH * 0.022; // 20px at base width
/** Speed at which walls move towards the ball */
export const WALL_SPEED = 2;
/** Gap (frames) between walls */
export const WALL_FREQUENCY = 150;

/** Physics */
export const GRAVITY = 0.08; //0.08;
export const JUMP_STRENGTH = -10; //-30;
