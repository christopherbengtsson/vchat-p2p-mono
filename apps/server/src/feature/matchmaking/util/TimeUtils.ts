/**
 * Gets current time as score for Redis (in seconds)
 */
const getCurrentTimeAsScore = (): number => Math.round(Date.now() / 1000);

export const TimeUtils = {
  getCurrentTimeAsScore,
};
