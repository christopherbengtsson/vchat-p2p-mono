/** Initialize variables for constants */
export let GAME_WIDTH = 900;
export let GAME_HEIGHT = 600;
export let BALL_RADIUS: number;
export let WALL_GAP: number;
export let WALL_WIDTH: number;

/** Other constants */
export const SMOOTHING_FRAMES = 35;
export const VOLUME_THRESHOLD = 0.1;
export const VOLUME_SCALE = 1.5;
export const WALL_SPEED = 2;
export const WALL_FREQUENCY = 150;
export const GRAVITY = 0.08;
export const JUMP_STRENGTH = -10;

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
