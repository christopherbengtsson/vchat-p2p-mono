import { MatchmakingQueueService } from '../MatchmakingQueueService.js';
import { ServerConfigService } from '../../../../common/config/service/ServerConfigService.js';
import { RedisClient } from '../../../../common/client/RedisClient.js';
import { useRedisTestHooks } from '../../../../common/test-utils/redis/hooks.js';

vi.mock('../../../../common/client/RedisClient.js');

describe('MatchmakingQueueService', async () => {
  const { getRedisClient } = useRedisTestHooks();

  beforeAll(() => {
    ServerConfigService.init(process.env);
  });

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    // Mock RedisClient to use our test instance
    vi.mocked(RedisClient.get).mockReturnValue(getRedisClient());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('addToQueue', () => {
    it('should add an item to the queue', async () => {
      await MatchmakingQueueService.addToQueue('socketId1', 'userId1');
      const queue = await MatchmakingQueueService._getQueue();
      expect(queue).toEqual(['socketId1__:__userId1']);
    });

    it('should add multiple items to the queue', async () => {
      await MatchmakingQueueService.addToQueue('socketId1', 'userId1');
      await MatchmakingQueueService.addToQueue('socketId2', 'userId2');
      const queue = await MatchmakingQueueService._getQueue();
      expect(queue).toEqual(['socketId1__:__userId1', 'socketId2__:__userId2']);
    });
  });

  describe('removeFromQueue', () => {
    it('should remove an item from queue when both socketId and userId are provided', async () => {
      await MatchmakingQueueService.addToQueue('socketId1', 'userId1');
      await MatchmakingQueueService.addToQueue('socketId2', 'userId2');

      await MatchmakingQueueService.removeFromQueue('socketId1', 'userId1');
      const queue = await MatchmakingQueueService._getQueue();
      expect(queue).toEqual(['socketId2__:__userId2']);
    });

    it('should remove an item from queue when only socketId is provided', async () => {
      await MatchmakingQueueService.addToQueue('socketId1', 'userId1');
      await MatchmakingQueueService.addToQueue('socketId2', 'userId2');

      await MatchmakingQueueService.removeFromQueue('socketId1', null);
      const queue = await MatchmakingQueueService._getQueue();
      expect(queue).toEqual(['socketId2__:__userId2']);
    });

    it('should handle removal when socketId is not found and userId is not provided', async () => {
      await MatchmakingQueueService.addToQueue('socketId1', 'userId1');

      await MatchmakingQueueService.removeFromQueue('nonexistentSocket', null);
      const queue = await MatchmakingQueueService._getQueue();
      expect(queue).toEqual(['socketId1__:__userId1']);
    });

    it('should handle multiple items with same socketId but different userIds', async () => {
      await MatchmakingQueueService.addToQueue('socketId1', 'userId1');
      await MatchmakingQueueService.addToQueue('socketId1', 'userId2');

      await MatchmakingQueueService.removeFromQueue('socketId1', 'userId1');
      const queue = await MatchmakingQueueService._getQueue();
      expect(queue).toEqual(['socketId1__:__userId2']);
    });
  });

  describe('getMultipleFromQueue', () => {
    it('should get multiple users from queue', async () => {
      await MatchmakingQueueService.addToQueue('socketId1', 'userId1');
      await MatchmakingQueueService.addToQueue('socketId2', 'userId2');

      const result = await MatchmakingQueueService.getMultipleFromQueue(0, 2);
      expect(result).toHaveLength(2);
      expect(result[0].key).toEqual('socketId1__:__userId1');
      expect(result[1].key).toEqual('socketId2__:__userId2');
    });

    it('should return empty array when queue is empty', async () => {
      const result = await MatchmakingQueueService.getMultipleFromQueue(0, 2);
      expect(result).toEqual([]);
    });

    it('should handle requesting more items than available', async () => {
      await MatchmakingQueueService.addToQueue('socketId1', 'userId1');

      const result = await MatchmakingQueueService.getMultipleFromQueue(0, 5);
      expect(result).toHaveLength(1);
      expect(result[0].key).toEqual('socketId1__:__userId1');
    });
  });

  describe('composeKey', () => {
    it('should compose key with socketId and userId', () => {
      const key = MatchmakingQueueService.composeKey({
        socketId: 'socket1',
        userId: 'user1',
      });
      expect(key).toEqual('socket1__:__user1');
    });

    it('should compose pattern with socketId only', () => {
      const key = MatchmakingQueueService.composeKey({
        socketId: 'socket1',
        userId: undefined,
      });
      expect(key).toEqual('socket1__:__*');
    });

    it('should compose pattern with userId only', () => {
      const key = MatchmakingQueueService.composeKey({
        socketId: undefined,
        userId: 'user1',
      });
      expect(key).toEqual('*__:__user1*');
    });
  });

  describe('splitRedisKey', () => {
    it('should split Redis key correctly', () => {
      const result = MatchmakingQueueService.splitRedisKey('socket1__:__user1');
      expect(result).toEqual({
        socketId: 'socket1',
        userId: 'user1',
      });
    });
  });

  describe('_getQueueCount', () => {
    it('should return queue count', async () => {
      await MatchmakingQueueService.addToQueue('socketId1', 'userId1');
      await MatchmakingQueueService.addToQueue('socketId2', 'userId2');

      const count = await MatchmakingQueueService._getQueueCount();
      expect(count).toBe(2);
    });

    it('should return 0 for empty queue', async () => {
      const count = await MatchmakingQueueService._getQueueCount();
      expect(count).toBe(0);
    });
  });

  describe('_getFirstInQueue', () => {
    it('should get first user in queue', async () => {
      await MatchmakingQueueService.addToQueue('socketId1', 'userId1');
      await MatchmakingQueueService.addToQueue('socketId2', 'userId2');

      const first = await MatchmakingQueueService._getFirstInQueue();
      expect(first).toEqual({
        socketId: 'socketId1',
        userId: 'userId1',
      });
    });

    it('should return null for empty queue', async () => {
      const first = await MatchmakingQueueService._getFirstInQueue();
      expect(first).toBeNull();
    });

    it('should get user at specific position', async () => {
      await MatchmakingQueueService.addToQueue('socketId1', 'userId1');
      await MatchmakingQueueService.addToQueue('socketId2', 'userId2');

      const second = await MatchmakingQueueService._getFirstInQueue(1);
      expect(second).toEqual({
        socketId: 'socketId2',
        userId: 'userId2',
      });
    });
  });

  describe('_findByMatchPatternInRegion', () => {
    it('should find user by pattern', async () => {
      await MatchmakingQueueService.addToQueue('socketId1', 'userId1');

      const result =
        await MatchmakingQueueService._findByMatchPatternInRegion(
          'socketId1__:__*',
        );
      expect(result).toEqual({
        socketId: 'socketId1',
        userId: 'userId1',
      });
    });

    it('should return null when pattern not found', async () => {
      const result =
        await MatchmakingQueueService._findByMatchPatternInRegion(
          'nonexistent__:__*',
        );
      expect(result).toBeNull();
    });
  });
});
