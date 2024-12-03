import { RedisMemoryServer } from 'redis-memory-server';
import { Redis } from 'ioredis';
import { WaitingQueueService } from '../WaitingQueueService.js';

describe('RedisQueue', () => {
  let redisServer: RedisMemoryServer;
  let redisClient: Redis;

  beforeAll(async () => {
    redisServer = new RedisMemoryServer();
    const host = await redisServer.getHost();
    const port = await redisServer.getPort();

    redisClient = new Redis({ host, port, lazyConnect: true });
    await redisClient.connect();
  });

  beforeEach(async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await redisClient.flushall();
  });

  afterAll(async () => {
    vi.useRealTimers();
    await redisServer.stop();
  });

  describe('queueKey', () => {
    it('should have the correct value', () => {
      const redisQueue = new WaitingQueueService(redisClient);
      expect(redisQueue['queueKey']).toBe('waiting_queue');
    });

    it('should be a private property', () => {
      new WaitingQueueService(redisClient);
      expect(
        Object.getOwnPropertyDescriptor(
          WaitingQueueService.prototype,
          'queueKey',
        ),
      ).toBeUndefined();
    });

    it('should be used consistently across instances', () => {
      const redisQueue1 = new WaitingQueueService(redisClient);
      const redisQueue2 = new WaitingQueueService(redisClient);
      expect(redisQueue1['queueKey']).toBe(redisQueue2['queueKey']);
    });
  });

  describe('addToQueue', () => {
    it('should add an item to the queue', async () => {
      const redisQueue = new WaitingQueueService(redisClient);
      await redisQueue.addToQueue('id1');
      const queue = await redisQueue.getQueue();
      expect(queue).toEqual(['id1']);
    });

    it('should add multiple items to the queue', async () => {
      const redisQueue = new WaitingQueueService(redisClient);
      await redisQueue.addToQueue('id1');
      await redisQueue.addToQueue('id2');
      const queue = await redisQueue.getQueue();
      expect(queue).toEqual(['id1', 'id2']);
    });

    it('should be put last in queue if already present', async () => {
      const redisQueue = new WaitingQueueService(redisClient);
      await redisQueue.addToQueue('id1');
      vi.advanceTimersByTime(1);
      await redisQueue.addToQueue('id2');
      vi.advanceTimersByTime(1);
      await redisQueue.addToQueue('id3');
      vi.advanceTimersByTime(1);

      const first = await redisQueue.getFirstInQueue();
      expect(first).toEqual('id1');

      await redisQueue.addToQueue('id1');
      const firstStill = await redisQueue.getFirstInQueue();
      expect(firstStill).toEqual('id2');
    });
  });

  describe('removeFromQueue', () => {
    it('should remove an item from the queue', async () => {
      const redisQueue = new WaitingQueueService(redisClient);
      await redisQueue.addToQueue('id1');
      await redisQueue.addToQueue('id2');
      await redisQueue.removeFromQueue('id1');
      const queue = await redisQueue.getQueue();
      expect(queue).toEqual(['id2']);
    });

    it('should not affect the queue if the item does not exist', async () => {
      const redisQueue = new WaitingQueueService(redisClient);
      await redisQueue.addToQueue('id1');
      await redisQueue.removeFromQueue('id2');
      const queue = await redisQueue.getQueue();
      expect(queue).toEqual(['id1']);
    });
  });

  describe('getQueueCount', () => {
    it('should return the correct count of items in the queue', async () => {
      const redisQueue = new WaitingQueueService(redisClient);
      await redisQueue.addToQueue('id1');
      await redisQueue.addToQueue('id2');
      const count = await redisQueue.getQueueCount();
      expect(count).toBe(2);
    });

    it('should return 0 for an empty queue', async () => {
      const redisQueue = new WaitingQueueService(redisClient);
      const count = await redisQueue.getQueueCount();
      expect(count).toBe(0);
    });
  });

  describe('getFirstInQueue', () => {
    it('should return the first item in the queue', async () => {
      const redisQueue = new WaitingQueueService(redisClient);
      await redisQueue.addToQueue('id1');
      await redisQueue.addToQueue('id2');
      const first = await redisQueue.getFirstInQueue();
      expect(first).toBe('id1');
    });

    it('should return null for an empty queue', async () => {
      const redisQueue = new WaitingQueueService(redisClient);
      const first = await redisQueue.getFirstInQueue();
      expect(first).toBeNull();
    });
  });

  describe('getQueue', () => {
    it('should return all items in the queue in order', async () => {
      const redisQueue = new WaitingQueueService(redisClient);
      await redisQueue.addToQueue('id1');
      await redisQueue.addToQueue('id2');
      await redisQueue.addToQueue('id3');
      const queue = await redisQueue.getQueue();
      expect(queue).toEqual(['id1', 'id2', 'id3']);
    });

    it('should return an empty array for an empty queue', async () => {
      const redisQueue = new WaitingQueueService(redisClient);
      const queue = await redisQueue.getQueue();
      expect(queue).toEqual([]);
    });
  });
});
