// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import RedisMock from 'ioredis-mock';
import { GenericContainer } from 'testcontainers';
import { MatchService } from '../MatchService.js';
import { SupabaseService } from '../../supabase/service/SupabaseService.js';
import { WaitingQueueService } from '../WaitingQueueService.js';

describe('MatchService', async () => {
  const container = await new GenericContainer('redis')
    .withExposedPorts(6379)
    .start();

  const redisClient = await new RedisMock({
    host: container.getHost(),
    port: container.getMappedPort(6379),
  });

  const redisQueue = new WaitingQueueService(redisClient);

  beforeEach(async () => {
    vi.clearAllMocks();

    vi.spyOn(SupabaseService, 'partnersNotIgnored').mockResolvedValue(true);
    await redisClient.flushall();
  });

  afterAll(async () => {
    redisClient?.disconnect();
    await container.stop();
  });

  describe('findMatch', () => {
    it('should add user to queue when queue is empty', async () => {
      await MatchService.findMatch(redisQueue, 'socket1', 'user1');

      await expect.poll(() => redisQueue.getQueueCount()).toBe(1);

      const firstInQueue = await redisQueue.getFirstInQueue();
      expect(firstInQueue).toEqual({
        socketId: 'socket1',
        userId: 'user1',
      });
    });

    it('should match users when queue has waiting user', async () => {
      await redisQueue.addToQueue('socket2', 'user2');

      const roomData = await MatchService.findMatch(
        redisQueue,
        'socket1',
        'user1',
      );

      expect(roomData).toEqual({
        roomId: expect.any(String),
        partnerSocketId: 'socket2',
        partnerUserId: 'user2',
      });
      await expect.poll(() => redisQueue.getQueueCount()).toBe(0);
    });

    it('should skip ignored partners and continue matching', async () => {
      vi.spyOn(SupabaseService, 'partnersNotIgnored')
        .mockResolvedValueOnce(false) // First partner ignored
        .mockResolvedValueOnce(true); // Second partner accepted
      const spyer = vi.spyOn(redisQueue, 'getFirstInQueue');

      await redisQueue.addToQueue('socket2', 'user2');
      await redisQueue.addToQueue('socket3', 'user3');

      const roomData = await MatchService.findMatch(
        redisQueue,
        'socket1',
        'user1',
      );

      // Should match with socket3 after skipping socket2
      expect(roomData).toEqual({
        roomId: expect.any(String),
        partnerSocketId: 'socket3',
        partnerUserId: 'user3',
      });
      await expect.poll(() => redisQueue.getQueueCount()).toBe(1);

      // expect recursive findMatch call
      expect(spyer).toHaveBeenCalledTimes(2);
      expect(spyer).toHaveBeenNthCalledWith(2, 1);
    });

    it('should add to queue if all potential matches are ignored', async () => {
      vi.spyOn(SupabaseService, 'partnersNotIgnored').mockResolvedValue(false);
      const spyer = vi.spyOn(redisQueue, 'getFirstInQueue');

      await redisQueue.addToQueue('socket2', 'user2');
      await MatchService.findMatch(redisQueue, 'socket1', 'user1');

      await expect.poll(() => redisQueue.getQueueCount()).toBe(2);

      // should not call getFirstInQueue again since it's only one one queue
      expect(spyer).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid match data when socketId is undefined', async () => {
      await expect.poll(() => redisQueue.getQueueCount()).toBe(0);
      vi.spyOn(
        WaitingQueueService.prototype,
        'getFirstInQueue',
      ).mockResolvedValueOnce({
        socketId: undefined as any,
        userId: 'user2',
      });
      await MatchService.findMatch(redisQueue, 'socket1', 'user1');

      await expect.poll(() => redisQueue.getQueueCount()).toBe(1);
    });

    it('should handle invalid match data when userId is undefined', async () => {
      await expect.poll(() => redisQueue.getQueueCount()).toBe(0);
      vi.spyOn(
        WaitingQueueService.prototype,
        'getFirstInQueue',
      ).mockResolvedValueOnce({
        socketId: 'socket2',
        userId: undefined as any,
      });
      await MatchService.findMatch(redisQueue, 'socket1', 'user1');
      await expect.poll(() => redisQueue.getQueueCount()).toBe(1);
    });

    it('should handle invalid parameters when socketId is undefined', async () => {
      await redisQueue.addToQueue('socket2', 'userId2');

      await MatchService.findMatch(
        redisQueue,

        undefined as any,
        'user1',
      );

      await expect.poll(() => redisQueue.getQueueCount()).toBe(1);
    });

    it('should handle invalid parameters when userId is undefined', async () => {
      await redisQueue.addToQueue('socket2', 'userId2');

      await MatchService.findMatch(
        redisQueue,

        'socket1',
        undefined as any,
      );

      await expect.poll(() => redisQueue.getQueueCount()).toBe(1);
    });

    it('should not match user with themselves', async () => {
      await redisQueue.addToQueue('socket1', 'user1');
      await MatchService.findMatch(redisQueue, 'socket1', 'user1');

      await expect.poll(() => redisQueue.getQueueCount()).toBe(1);
    });

    it('should handle queue position limits and add to queue when limit reached', async () => {
      // Add multiple users to queue
      await redisQueue.addToQueue('socket2', 'user2');
      await redisQueue.addToQueue('socket3', 'user3');
      await redisQueue.addToQueue('socket4', 'user4');

      // Make all potential matches ignored
      vi.spyOn(SupabaseService, 'partnersNotIgnored').mockResolvedValue(false);

      await MatchService.findMatch(redisQueue, 'socket1', 'user1');

      // Verify user was added to queue after checking all positions
      await expect.poll(() => redisQueue.getQueueCount()).toBe(4);
    });

    it('should try all queue positions until finding valid match', async () => {
      await redisQueue.addToQueue('socket2', 'user2');
      await redisQueue.addToQueue('socket3', 'user3');
      await redisQueue.addToQueue('socket4', 'user4');

      vi.spyOn(SupabaseService, 'partnersNotIgnored')
        .mockResolvedValueOnce(false) // First partner ignored
        .mockResolvedValueOnce(false) // Second partner ignored
        .mockResolvedValueOnce(true); // Third partner accepted

      const roomData = await MatchService.findMatch(
        redisQueue,
        'socket1',
        'user1',
      );

      // Should match with socket4 after skipping socket2 and socket3
      expect(roomData).toEqual({
        roomId: expect.any(String),
        partnerSocketId: 'socket4',
        partnerUserId: 'user4',
      });
      await expect.poll(() => redisQueue.getQueueCount()).toBe(2);
    });
  });
});
