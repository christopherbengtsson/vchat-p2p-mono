import { DEVICE_PROFILE } from '../../config/PerformanceConfig';

// Frame rate normalization - all speeds calibrated for 240 FPS
export const TARGET_FPS = 240;
export const TARGET_FRAME_TIME = 1000 / TARGET_FPS; // 4.16ms

// Object dimensions (percentages of canvas)
export const BASE_PLAYER_SIZE_PERCENT = 0.07; // 7% of canvas width
export const PLAYER_WIDTH_PERCENT = BASE_PLAYER_SIZE_PERCENT;
export const PLAYER_X_POS_MULTIPLIER = 0.15; // 15% from the left edge

// Game physics constants
export const GRAVITY = 0.05;
export const SMOOTHING_FACTOR = 0.02;
export const VELOCITY_DAMP = 5;
export const BACKGROUND_SPEED_MULTIPLIER = 0.1;
export const PIPE_FREQUENCY = 300;
export const MAX_PIPE_FREQUENCY = 60;
export const PIPE_GAP_MULTIPLIER = 4; // Gap is 4x player height
export const BASE_PIPE_WIDTH_PERCENT = 0.075; // 7.5% of canvas width

// Game difficulty scaling
export const DIFFICULTY = {
  INITIAL_SPEED: 0.7,
  SPEED_INCREMENT: 0.035, // Speed increases slightly over time
  MAX_SPEED: 5,
};

export const DEATH_PHYSICS = {
  BOUNCE_VELOCITY: -5,
  HORIZONTAL_VELOCITY: -40,
  ROTATION_SPEED: 0.1,
  GRAVITY_MULTIPLIER: 1.2,
};

// Debug settings
export const DEBUG = {
  SHOW_HITBOX: import.meta.env.DEV,
  HITBOX_COLOR: 'rgba(255, 0, 0, 0.5)',
};

// Pre-calculated performance optimizations
export const PERFORMANCE = {
  // Audio throttle interval - device-specific (20-30 FPS)
  AUDIO_THROTTLE_MS: DEVICE_PROFILE.audioPitchThrottle,
  // Canvas stream frame rate for WebRTC - device-specific (10-15 FPS)
  CANVAS_STREAM_FPS: DEVICE_PROFILE.canvasStreamFPS,
  // Object pooling - pre-allocate pipes to avoid GC pressure
  PIPE_POOL_SIZE: 20,
};
