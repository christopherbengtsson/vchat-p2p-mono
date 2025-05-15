import { logger } from './logger.js';

const start = (name: string) => {
  const start = performance.now();
  return () =>
    logger.debug(`${name} took ${Math.round(performance.now() - start)}ms`);
};

export const PerformanceUtil = {
  start,
};
