import gameAssetsSrc from '@/assets/tiles.png';

// Game dimensions and responsive scaling
export const BASE_WIDTH = 800; // Reference width for scaling calculations
export const BASE_HEIGHT = 600; // Reference height for scaling calculations

// Object dimensions (percentages of canvas)
export const PLAYER_SIZE_PERCENT = 0.05; // 5% of canvas width
export const PLAYER_WIDTH_PERCENT = PLAYER_SIZE_PERCENT;
export const PLAYER_HEIGHT_PERCENT = PLAYER_SIZE_PERCENT; // Same as width for square
export const PLAYER_X_POS_MULTIPLIER = 0.15; // 15% from the left edge

// Game physics constants
export const GRAVITY = 0.05;
export const SMOOTHING_FACTOR = 0.02;
export const BACKGROUND_SPEED_MULTIPLIER = 0.1;
export const WALL_FREQUENCY = 300;
export const WALL_GAP_PERCENT = PLAYER_SIZE_PERCENT * 4; // 4x player size
export const WALL_WIDTH_PERCENT = 0.075; // 7.5% of canvas width

// Load the sprite sheet
const tiles = new Image();
tiles.src = gameAssetsSrc;

// Define sprite coordinates
export const SPRITE_COORDS = {
  TRUMP: { x: 0, y: 0, width: 178, height: 178 },
  TRUMP_EYEBROWS_UP: { x: 0, y: 178, width: 178, height: 178 },
  BRICKS: { x: 0, y: 356, width: 263, height: 222.5 },
  BRICKS_BOTTOM: { x: 0, y: 576, width: 263, height: 49 },
  PIPE_TOP: { x: 178, y: 0, width: 32, height: 19 },
  PIPE: { x: 180, y: 19, width: 28, height: 42 },
  PIPE_BOTTOM: { x: 178, y: 61, width: 32, height: 19 },
  SKY: { x: 0, y: 627, width: 256, height: 256 },
  CLOUD: { x: 178, y: 80, width: 66, height: 45 },
};

// Export the sprite sheet and coordinates
export const ASSETS = {
  TILES: tiles,
  COORDS: SPRITE_COORDS,
  SHEET_SIZE: { width: 1024, height: 1024 },
};

// Visual style constants
export const COLORS = {
  BACKGROUND: '#87CEEB', // Sky blue
  PLAYER: '#FFFF00', // Yellow
  WALL: '#4CAF50', // Green
  SCORE: '#FFFFFF', // White
  SCORE_SHADOW: 'rgba(0, 0, 0, 0.5)', // Black shadow with alpha
};

// Typography
export const TYPOGRAPHY = {
  SCORE_FONT_SIZE: 24,
  SCORE_FONT_FAMILY: '"Inter", sans-serif',
  SCORE_PADDING: 20,
};

// Device breakpoints (matching Tailwind defaults)
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
};

// Game difficulty scaling
export const DIFFICULTY = {
  INITIAL_SPEED: 2,
  SPEED_INCREMENT: 0.0001, // Speed increases slightly over time
  MAX_SPEED: 5,
};

// Debug settings
export const DEBUG = {
  SHOW_HITBOX: import.meta.env.DEV,
  HITBOX_COLOR: 'rgba(255, 0, 0, 0.5)',
};
