import { log } from './common/util/logger.js';

beforeAll(() => {
  log.error = vi.fn();
  log.warn = vi.fn();
  log.info = vi.fn();
  log.debug = vi.fn();
});
