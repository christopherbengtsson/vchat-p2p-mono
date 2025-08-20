import { Pipe } from '../model/Pipe';
import { PERFORMANCE } from '../model/constants';

// Pool state
let pool: Pipe[] = [];
let initialized = false;

/**
 * Initialize the pipe pool with inactive pipe objects
 */
const initialize = () => {
  if (initialized) return;

  pool = [];
  for (let i = 0; i < PERFORMANCE.PIPE_POOL_SIZE; i++) {
    pool.push({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      passed: false,
      isUpperPipe: false,
      active: false,
    });
  }
  initialized = true;
};

/**
 * Get an inactive pipe from the pool and activate it
 */
const acquire = (
  x: number,
  y: number,
  width: number,
  height: number,
  isUpperPipe: boolean,
): Pipe | null => {
  const inactivePipe = pool.find((pipe) => !pipe.active);

  if (!inactivePipe) {
    // Pool exhausted - this shouldn't happen with proper sizing
    console.warn('Pipe pool exhausted, creating new pipe');
    return {
      x,
      y,
      width,
      height,
      passed: false,
      isUpperPipe,
      active: true,
    };
  }

  // Reset and activate the pipe
  inactivePipe.x = x;
  inactivePipe.y = y;
  inactivePipe.width = width;
  inactivePipe.height = height;
  inactivePipe.passed = false;
  inactivePipe.isUpperPipe = isUpperPipe;
  inactivePipe.active = true;

  return inactivePipe;
};

/**
 * Deactivate a pipe and return it to the pool
 */
const release = (pipe: Pipe) => {
  pipe.active = false;
  // Reset position to indicate it's unused
  pipe.x = -1000;
};

/**
 * Get all active pipes
 */
const getActivePipes = (): Pipe[] => {
  return pool.filter((pipe) => pipe.active);
};

/**
 * Reset all pipes to inactive state
 */
const reset = () => {
  pool.forEach((pipe) => {
    pipe.active = false;
    pipe.x = -1000;
    pipe.passed = false;
  });
};

/**
 * Get pool statistics for debugging
 */
const getStats = () => {
  const active = pool.filter((pipe) => pipe.active).length;
  const inactive = pool.length - active;
  return { active, inactive, total: pool.length };
};

export const PipePoolService = {
  initialize,
  acquire,
  release,
  getActivePipes,
  reset,
  getStats,
};
