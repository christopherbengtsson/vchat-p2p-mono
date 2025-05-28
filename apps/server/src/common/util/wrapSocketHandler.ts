import { log } from './logger.js';

export const wrapSocketHandler = <
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends (...args: any[]) => void | Promise<void>,
>(
  handler: T,
) => {
  return async (...args: Parameters<T>): Promise<void> => {
    return Promise.resolve()
      .then(() => handler(...args))
      .catch((error: unknown) => {
        log.error({ error }, 'Socket handler error');
      });
  };
};
