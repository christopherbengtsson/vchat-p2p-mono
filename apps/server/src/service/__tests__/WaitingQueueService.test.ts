// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import RedisMock from 'ioredis-mock';
import { GenericContainer } from 'testcontainers';
import { WaitingQueueService } from '../WaitingQueueService.js';

describe('RedisQueue', async () => {
  const container = await new GenericContainer('redis')
    .withExposedPorts(6379)
    .start();

  const redisClient = new RedisMock({
    host: container.getHost(),
    port: container.getMappedPort(6379),
  });

  beforeEach(async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await redisClient.flushall();
  });

  afterAll(async () => {
    vi.useRealTimers();
    redisClient?.disconnect();
    await container?.stop();
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
      await redisQueue.addToQueue('socketId1', 'userId1');
      const queue = await redisQueue.getQueue();
      expect(queue).toEqual(['socketId1__:__userId1']);
    });

    it('should add multiple items to the queue', async () => {
      const redisQueue = new WaitingQueueService(redisClient);
      await redisQueue.addToQueue('socketId1', 'userId1');
      await redisQueue.addToQueue('socketId2', 'userId2');
      const queue = await redisQueue.getQueue();
      expect(queue).toEqual(['socketId1__:__userId1', 'socketId2__:__userId2']);
    });

    it('should be put last in queue if already present', async () => {
      const redisQueue = new WaitingQueueService(redisClient);
      await redisQueue.addToQueue('socketId1', 'userId1');
      vi.advanceTimersByTime(1);
      await redisQueue.addToQueue('socketId2', 'userId2');
      vi.advanceTimersByTime(1);
      await redisQueue.addToQueue('socketId3', 'userId3');
      vi.advanceTimersByTime(1);

      const first = await redisQueue.getFirstInQueue();
      expect(first?.socketId).toEqual('socketId1');
      expect(first?.userId).toEqual('userId1');

      await redisQueue.addToQueue('socketId1', 'userId1');
      const firstStill = await redisQueue.getFirstInQueue();
      expect(firstStill).toStrictEqual({
        socketId: 'socketId2',
        userId: 'userId2',
      });
    });
  });

  describe('removeFromQueue', () => {
    it('should remove an item from queue when both socketId and userId are provided', async () => {
      const redisQueue = new WaitingQueueService(redisClient);
      await redisQueue.addToQueue('socketId1', 'userId1');
      await redisQueue.addToQueue('socketId2', 'userId2');

      await redisQueue.removeFromQueue('socketId1', 'userId1');
      const queue = await redisQueue.getQueue();
      expect(queue).toEqual(['socketId2__:__userId2']);
    });

    it('should remove an item from queue when only socketId is provided', async () => {
      const redisQueue = new WaitingQueueService(redisClient);
      await redisQueue.addToQueue('socketId1', 'userId1');
      await redisQueue.addToQueue('socketId2', 'userId2');

      await redisQueue.removeFromQueue('socketId1', null);
      const queue = await redisQueue.getQueue();
      expect(queue).toEqual(['socketId2__:__userId2']);
    });

    it('should handle removal when socketId is not found and userId is not provided', async () => {
      const redisQueue = new WaitingQueueService(redisClient);
      await redisQueue.addToQueue('socketId1', 'userId1');

      await redisQueue.removeFromQueue('nonexistentSocket', null);
      const queue = await redisQueue.getQueue();
      expect(queue).toEqual(['socketId1__:__userId1']);
    });

    it('should handle multiple items with same socketId but different userIds', async () => {
      const redisQueue = new WaitingQueueService(redisClient);
      await redisQueue.addToQueue('socketId1', 'userId1');
      await redisQueue.addToQueue('socketId1', 'userId2');

      await redisQueue.removeFromQueue('socketId1', 'userId1');
      const queue = await redisQueue.getQueue();
      expect(queue).toEqual(['socketId1__:__userId2']);
    });
  });

  describe('getQueueCount', () => {
    it('should return the correct count of items in the queue', async () => {
      const redisQueue = new WaitingQueueService(redisClient);
      await redisQueue.addToQueue('socketId1', 'userId1');
      await redisQueue.addToQueue('socketId2', 'userId2');
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
      await redisQueue.addToQueue('socketId1', 'userId1');
      await redisQueue.addToQueue('socketId2', 'userId2');
      const first = await redisQueue.getFirstInQueue();
      expect(first).toStrictEqual({
        socketId: 'socketId1',
        userId: 'userId1',
      });
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
      await redisQueue.addToQueue('socketId1', 'userId1');
      await redisQueue.addToQueue('socketId2', 'userId2');
      await redisQueue.addToQueue('socketId3', 'userId3');
      const queue = await redisQueue.getQueue();
      expect(queue).toEqual([
        'socketId1__:__userId1',
        'socketId2__:__userId2',
        'socketId3__:__userId3',
      ]);
    });

    it('should return an empty array for an empty queue', async () => {
      const redisQueue = new WaitingQueueService(redisClient);
      const queue = await redisQueue.getQueue();
      expect(queue).toEqual([]);
    });
  });
});
