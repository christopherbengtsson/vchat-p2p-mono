/** Base game dimensions (virtual canvas size) */
export let GAME_WIDTH = 900;
export let GAME_HEIGHT = 600;

/** Ball size */
export let BALL_RADIUS: number;
/** Gap between top and bottom walls */
export let WALL_GAP: number;
export let WALL_WIDTH: number;

/** Dont make it too sensitive to volume changes */
export const SMOOTHING_FRAMES = 35;
/** Cancel out small noises */
export const VOLUME_THRESHOLD = 0.1;
/** Scale volume relative to canvas height (both are ~0-1) */
export const VOLUME_SCALE = 1.5;

/** Walls */

/** Speed at which walls move towards the ball */
export const WALL_SPEED = 2;
/** Gap (frames) between walls */
export const WALL_FREQUENCY = 150;

/** Physics */
export const GRAVITY = 0.08; //0.08;
export const JUMP_STRENGTH = -10; //-30;

export const setGameDimensions = (isPortrait: boolean) => {
  if (isPortrait) {
    GAME_WIDTH = 600;
    GAME_HEIGHT = 900;
  } else {
    GAME_WIDTH = 900;
    GAME_HEIGHT = 600;
  }
  updateConstants();
};

/** Function to update constants whenever game dimensions change */
export const updateConstants = () => {
  BALL_RADIUS = GAME_WIDTH * 0.022;
  WALL_GAP = GAME_HEIGHT * 0.25;
  WALL_WIDTH = GAME_WIDTH * 0.022;
};

/** Initialize constants */
updateConstants();
