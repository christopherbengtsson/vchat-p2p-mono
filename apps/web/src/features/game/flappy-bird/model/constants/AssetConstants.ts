import gameAssetsSrc from '@/assets/tiles.png';

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
