import { QueueService } from '../queue/QueueService.js';
import { ServerConfigService } from '../../../../common/config/service/ServerConfigService.js';
import { REDIS_KEY } from '../../model/RedisKey.js';

describe('MatchmakingQueueService', async () => {
  beforeAll(() => {
    ServerConfigService.init(process.env);
  });

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('addToQueue', () => {
    it('should add an item to the queue', async () => {
      await QueueService.addToQueue('socketId1', 'userId1', []);
      const queue = await QueueService._getQueue();
      expect(queue).toEqual(['socketId1__:__userId1']);
    });

    it('should add multiple items to the queue', async () => {
      await QueueService.addToQueue('socketId1', 'userId1', []);
      await QueueService.addToQueue('socketId2', 'userId2', []);
      const queue = await QueueService._getQueue();
      expect(queue).toEqual(['socketId1__:__userId1', 'socketId2__:__userId2']);
    });

    it('should store ignoreList in Redis when provided', async () => {
      const ignoreList = ['userId2', 'userId3', 'userId4'];
      await QueueService.addToQueue('socketId1', 'userId1', ignoreList);

      // Verify user is in queue
      const queue = await QueueService._getQueue();
      expect(queue).toEqual(['socketId1__:__userId1']);

      // Verify ignoreList is stored in Redis
      const member = QueueService.composeKey({
        socketId: 'socketId1',
        userId: 'userId1',
      });
      const storedIgnoreList = await globalThis.redisClient.smembers(
        REDIS_KEY.getIgnoreKey(member),
      );
      expect(storedIgnoreList.sort()).toEqual(ignoreList.sort());
    });

    it('should not store ignoreList in Redis when empty', async () => {
      await QueueService.addToQueue('socketId1', 'userId1', []);

      // Verify user is in queue
      const queue = await QueueService._getQueue();
      expect(queue).toEqual(['socketId1__:__userId1']);

      // Verify no ignoreList key is created for empty arrays
      const member = QueueService.composeKey({
        socketId: 'socketId1',
        userId: 'userId1',
      });
      const exists = await globalThis.redisClient.exists(
        REDIS_KEY.getIgnoreKey(member),
      );
      expect(exists).toBe(0);
    });
  });

  describe('removeFromQueue', () => {
    it('should remove an item from queue when both socketId and userId are provided', async () => {
      await QueueService.addToQueue('socketId1', 'userId1', []);
      await QueueService.addToQueue('socketId2', 'userId2', []);

      await QueueService.removeFromQueue('socketId1', 'userId1');
      const queue = await QueueService._getQueue();
      expect(queue).toEqual(['socketId2__:__userId2']);
    });

    it('should remove an item from queue when only socketId is provided', async () => {
      await QueueService.addToQueue('socketId1', 'userId1', []);
      await QueueService.addToQueue('socketId2', 'userId2', []);

      await QueueService.removeFromQueue('socketId1', null);
      const queue = await QueueService._getQueue();
      expect(queue).toEqual(['socketId2__:__userId2']);
    });

    it('should handle removal when socketId is not found and userId is not provided', async () => {
      await QueueService.addToQueue('socketId1', 'userId1', []);

      await QueueService.removeFromQueue('nonexistentSocket', null);
      const queue = await QueueService._getQueue();
      expect(queue).toEqual(['socketId1__:__userId1']);
    });

    it('should handle multiple items with same socketId but different userIds', async () => {
      await QueueService.addToQueue('socketId1', 'userId1', []);
      await QueueService.addToQueue('socketId1', 'userId2', []);

      await QueueService.removeFromQueue('socketId1', 'userId1');
      const queue = await QueueService._getQueue();
      expect(queue).toEqual(['socketId1__:__userId2']);
    });
  });

  describe('getMultipleFromQueue', () => {
    it('should get multiple users from queue', async () => {
      await QueueService.addToQueue('socketId1', 'userId1', []);
      await QueueService.addToQueue('socketId2', 'userId2', []);

      const result = await QueueService.getMultipleFromQueue(0, 2);
      expect(result).toHaveLength(2);
      expect(result[0].key).toEqual('socketId1__:__userId1');
      expect(result[1].key).toEqual('socketId2__:__userId2');
    });

    it('should return empty array when queue is empty', async () => {
      const result = await QueueService.getMultipleFromQueue(0, 2);
      expect(result).toEqual([]);
    });

    it('should handle requesting more items than available', async () => {
      await QueueService.addToQueue('socketId1', 'userId1', []);

      const result = await QueueService.getMultipleFromQueue(0, 5);
      expect(result).toHaveLength(1);
      expect(result[0].key).toEqual('socketId1__:__userId1');
    });
  });

  describe('composeKey', () => {
    it('should compose key with socketId and userId', () => {
      const key = QueueService.composeKey({
        socketId: 'socket1',
        userId: 'user1',
      });
      expect(key).toEqual('socket1__:__user1');
    });

    it('should compose pattern with socketId only', () => {
      const key = QueueService.composeKey({
        socketId: 'socket1',
        userId: undefined,
      });
      expect(key).toEqual('socket1__:__*');
    });

    it('should compose pattern with userId only', () => {
      const key = QueueService.composeKey({
        socketId: undefined,
        userId: 'user1',
      });
      expect(key).toEqual('*__:__user1*');
    });
  });

  describe('splitRedisKey', () => {
    it('should split Redis key correctly', () => {
      const result = QueueService.splitRedisKey('socket1__:__user1');
      expect(result).toEqual({
        socketId: 'socket1',
        userId: 'user1',
      });
    });
  });

  describe('_getQueueCount', () => {
    it('should return queue count', async () => {
      await QueueService.addToQueue('socketId1', 'userId1', []);
      await QueueService.addToQueue('socketId2', 'userId2', []);

      const count = await QueueService._getQueueCount();
      expect(count).toBe(2);
    });

    it('should return 0 for empty queue', async () => {
      const count = await QueueService._getQueueCount();
      expect(count).toBe(0);
    });
  });

  describe('_getFirstInQueue', () => {
    it('should get first user in queue', async () => {
      await QueueService.addToQueue('socketId1', 'userId1', []);
      await QueueService.addToQueue('socketId2', 'userId2', []);

      const first = await QueueService._getFirstInQueue();
      expect(first).toEqual({
        socketId: 'socketId1',
        userId: 'userId1',
      });
    });

    it('should return null for empty queue', async () => {
      const first = await QueueService._getFirstInQueue();
      expect(first).toBeNull();
    });

    it('should get user at specific position', async () => {
      await QueueService.addToQueue('socketId1', 'userId1', []);
      await QueueService.addToQueue('socketId2', 'userId2', []);

      const second = await QueueService._getFirstInQueue(1);
      expect(second).toEqual({
        socketId: 'socketId2',
        userId: 'userId2',
      });
    });
  });

  describe('_findByMatchPatternInRegion', () => {
    it('should find user by pattern', async () => {
      await QueueService.addToQueue('socketId1', 'userId1', []);

      const result =
        await QueueService._findByMatchPatternInRegion('socketId1__:__*');
      expect(result).toEqual({
        socketId: 'socketId1',
        userId: 'userId1',
      });
    });

    it('should return null when pattern not found', async () => {
      const result =
        await QueueService._findByMatchPatternInRegion('nonexistent__:__*');
      expect(result).toBeNull();
    });
  });
});
