import logger from './logger.js';

export const wrapSocketHandler = <
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends (...args: any[]) => Promise<void> | void,
>(
  handler: T,
) => {
  const handleError = (error: unknown) => {
    logger.error({ error }, 'Socket handler error');
  };

  return (...args: Parameters<T>) => {
    try {
      const ret = handler.apply(this, args);
      if (ret && typeof ret.catch === 'function') {
        ret.catch(handleError);
      }
    } catch (e) {
      handleError(e);
    }
  };
};
