import { Redis } from 'ioredis';
import { RedisMemoryServer } from 'redis-memory-server';
import { MatchService } from '../MatchService.js';
import { SupabaseService } from '../../supabase/service/SupabaseService.js';
import type { VChatSocket } from '../../model/VChatSocket.js';
import { WaitingQueueService } from '../WaitingQueueService.js';

describe('MatchService', () => {
  let redisServer: RedisMemoryServer;
  let redisClient: Redis;
  let redisQueue: WaitingQueueService;
  let mockSocket: VChatSocket;

  beforeAll(async () => {
    redisServer = new RedisMemoryServer();
    const host = await redisServer.getHost();
    const port = await redisServer.getPort();

    redisClient = new Redis({ host, port, lazyConnect: true });
    await redisClient.connect();
    redisQueue = new WaitingQueueService(redisClient);
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    mockSocket = {
      id: 'socket1',
      emit: vi.fn(),
      to: vi.fn().mockReturnValue({ emit: vi.fn() }),
    } as unknown as VChatSocket;

    vi.spyOn(SupabaseService, 'partnersNotIgnored').mockResolvedValue(true);
    await redisClient.flushall();
  });

  afterAll(async () => {
    await redisServer.stop();
  });

  describe('findMatch', () => {
    it('should add user to queue when queue is empty', async () => {
      await MatchService.findMatch(redisQueue, mockSocket, 'socket1', 'user1');

      await expect.poll(() => redisQueue.getQueueCount()).toBe(1);

      const firstInQueue = await redisQueue.getFirstInQueue();
      expect(firstInQueue).toEqual({
        socketId: 'socket1',
        userId: 'user1',
      });
    });

    it('should match users when queue has waiting user', async () => {
      await redisQueue.addToQueue('socket2', 'user2');

      await MatchService.findMatch(redisQueue, mockSocket, 'socket1', 'user1');

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'match-found',
        expect.any(String),
        'socket2',
        'user2',
        true,
      );
    });

    it('should skip ignored partners and continue matching', async () => {
      vi.spyOn(SupabaseService, 'partnersNotIgnored')
        .mockResolvedValueOnce(false) // First partner ignored
        .mockResolvedValueOnce(true); // Second partner accepted

      await redisQueue.addToQueue('socket2', 'user2');
      await redisQueue.addToQueue('socket3', 'user3');

      await MatchService.findMatch(redisQueue, mockSocket, 'socket1', 'user1');

      // Should match with socket3 after skipping socket2
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'match-found',
        expect.any(String),
        'socket3',
        'user3',
        true,
      );
    });

    it('should add to queue if all potential matches are ignored', async () => {
      vi.spyOn(SupabaseService, 'partnersNotIgnored').mockResolvedValue(false);

      await redisQueue.addToQueue('socket2', 'user2');
      await MatchService.findMatch(redisQueue, mockSocket, 'socket1', 'user1');

      await expect.poll(() => redisQueue.getQueueCount()).toBe(2);
      expect(mockSocket.emit).not.toHaveBeenCalled();
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
      await MatchService.findMatch(redisQueue, mockSocket, 'socket1', 'user1');

      expect(mockSocket.emit).not.toHaveBeenCalled();
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
      await MatchService.findMatch(redisQueue, mockSocket, 'socket1', 'user1');

      expect(mockSocket.emit).not.toHaveBeenCalled();
      await expect.poll(() => redisQueue.getQueueCount()).toBe(1);
    });

    it('should handle invalid parameters when socketId is undefined', async () => {
      await redisQueue.addToQueue('socket2', 'userId2');

      await MatchService.findMatch(
        redisQueue,
        mockSocket,
        undefined as any,
        'user1',
      );

      expect(mockSocket.emit).not.toHaveBeenCalled();
      await expect.poll(() => redisQueue.getQueueCount()).toBe(1);
    });

    it('should handle invalid parameters when userId is undefined', async () => {
      await redisQueue.addToQueue('socket2', 'userId2');

      await MatchService.findMatch(
        redisQueue,
        mockSocket,
        'socket1',
        undefined as any,
      );

      expect(mockSocket.emit).not.toHaveBeenCalled();
      await expect.poll(() => redisQueue.getQueueCount()).toBe(1);
    });

    it('should not match user with themselves', async () => {
      await redisQueue.addToQueue('socket1', 'user1');
      await MatchService.findMatch(redisQueue, mockSocket, 'socket1', 'user1');

      expect(mockSocket.emit).not.toHaveBeenCalled();
      await expect.poll(() => redisQueue.getQueueCount()).toBe(1);
    });

    it('should handle queue position limits and add to queue when limit reached', async () => {
      // Add multiple users to queue
      await redisQueue.addToQueue('socket2', 'user2');
      await redisQueue.addToQueue('socket3', 'user3');
      await redisQueue.addToQueue('socket4', 'user4');

      // Make all potential matches ignored
      vi.spyOn(SupabaseService, 'partnersNotIgnored').mockResolvedValue(false);

      await MatchService.findMatch(redisQueue, mockSocket, 'socket1', 'user1');

      // Verify user was added to queue after checking all positions
      await expect.poll(() => redisQueue.getQueueCount()).toBe(4);
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it('should try all queue positions until finding valid match', async () => {
      await redisQueue.addToQueue('socket2', 'user2');
      await redisQueue.addToQueue('socket3', 'user3');
      await redisQueue.addToQueue('socket4', 'user4');

      vi.spyOn(SupabaseService, 'partnersNotIgnored')
        .mockResolvedValueOnce(false) // First partner ignored
        .mockResolvedValueOnce(false) // Second partner ignored
        .mockResolvedValueOnce(true); // Third partner accepted

      await MatchService.findMatch(redisQueue, mockSocket, 'socket1', 'user1');

      // Should match with socket4 after skipping socket2 and socket3
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'match-found',
        expect.any(String),
        'socket4',
        'user4',
        true,
      );
    });
  });
});
