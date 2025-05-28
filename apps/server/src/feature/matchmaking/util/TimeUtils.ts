/**
 * Gets current time as score for Redis (in seconds, rounded for optimization)
 */
const getCurrentTimeAsScore = (): number => Math.round(Date.now() / 1000);

export const TimeUtils = {
  getCurrentTimeAsScore,
};
