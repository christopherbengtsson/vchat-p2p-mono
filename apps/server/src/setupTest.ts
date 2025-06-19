import { RedisClient } from './common/client/RedisClient.js';
import { log } from './common/util/logger.js';
import {
  getGlobalRedis,
  cleanupGlobalRedis,
  flushGlobalRedis,
} from './common/test-utils/global-redis.js';

vi.mock('./common/client/RedisClient.js', () => ({
  RedisClient: {
    get: vi.fn(() => globalThis.redisClient),
  },
}));

beforeAll(async () => {
  log.error = vi.fn();
  log.warn = vi.fn();
  log.info = vi.fn();
  log.debug = vi.fn();

  globalThis.redisClient = await getGlobalRedis();
});

afterAll(async () => {
  await cleanupGlobalRedis();
});

beforeEach(async () => {
  await flushGlobalRedis();
  vi.mocked(RedisClient.get).mockReturnValue(globalThis.redisClient);
});
