// Cloud generation and movement
export const CLOUD_FREQUENCY = 200; // How often clouds appear
export const CLOUD_SPEED_MULTIPLIER = {
  BASE: 0.3, // Base speed multiplier (middle ground)
  MIN: 0.2, // Minimum speed for small/distant clouds
  MAX: 0.4, // Maximum speed for large/close clouds
};
export const BASE_CLOUD_SIZE_PERCENT = 0.08; // 8% of canvas width
export const CLOUD_COUNT_RANGE = { MIN: 2, MAX: 5 }; // Number of clouds visible at once
export const CLOUD_VERTICAL_RANGE = { MIN: 0.1, MAX: 0.4 }; // Vertical position range (% of canvas height)
export const CLOUD_OPACITY_RANGE = { MIN: 0.9, MAX: 1 }; // Varying opacity for depth effect
export const CLOUD_SCALE_RANGE = { MIN: 0.7, MAX: 2.7 }; // Size variation for clouds
