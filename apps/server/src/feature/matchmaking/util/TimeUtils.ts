/**
 * Time utilities for Redis-based matchmaking system.
 * Redis scores are stored in seconds for better readability and reduced precision needs.
 */

/**
 * Gets current time as score for Redis (in seconds, rounded for optimization)
 * Rounding to nearest second reduces Redis memory usage and query complexity
 * while maintaining sufficient precision for matchmaking timing.
 */
const getCurrentTimeAsScore = (): number => Math.round(Date.now() / 1000);

export const TimeUtils = {
  getCurrentTimeAsScore,
};
