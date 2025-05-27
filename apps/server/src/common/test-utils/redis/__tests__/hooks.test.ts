import { describe, it, expect } from 'vitest';
import { useRedisTestHooks } from '../hooks.js';

describe('Redis Test Hooks', () => {
  const { getRedisClient, flushAll } = useRedisTestHooks();

  it('should provide a working Redis client', async () => {
    const redis = getRedisClient();

    // Test basic Redis operations
    await redis.set('test-key', 'test-value');
    const value = await redis.get('test-key');

    expect(value).toBe('test-value');
  });

  it('should automatically flush data between tests', async () => {
    const redis = getRedisClient();

    // This key should not exist because data is flushed between tests
    const value = await redis.get('test-key');
    expect(value).toBeNull();

    // Set a new value for next test to verify isolation
    await redis.set('test-key-2', 'test-value-2');
    expect(await redis.get('test-key-2')).toBe('test-value-2');
  });

  it('should support manual flush', async () => {
    const redis = getRedisClient();

    await redis.set('manual-test', 'value');
    expect(await redis.get('manual-test')).toBe('value');

    await flushAll();
    expect(await redis.get('manual-test')).toBeNull();
  });
});
