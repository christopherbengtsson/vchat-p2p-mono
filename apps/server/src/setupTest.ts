import logger from './utils/logger.js';

beforeAll(() => {
  logger.error = vi.fn();
  logger.warn = vi.fn();
  logger.info = vi.fn();
  logger.debug = vi.fn();
});
