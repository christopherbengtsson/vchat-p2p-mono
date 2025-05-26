import { Redis } from 'ioredis';
import { RedisMemoryServer } from 'redis-memory-server';
import { MatchAssignmentService } from '../MatchAssignmentService.js';
import { RedisClient } from '../../../../common/client/RedisClient.js';

vi.mock('../../../../common/client/RedisClient.js');

describe('MatchAssignmentService', async () => {
  let redisServer: RedisMemoryServer;
  let redisClient: Redis;

  beforeAll(async () => {
    // Start Redis memory server
    redisServer = new RedisMemoryServer();
    const host = await redisServer.getHost();
    const port = await redisServer.getPort();

    // Create Redis client
    redisClient = new Redis({
      host,
      port,
      maxRetriesPerRequest: 0,
      lazyConnect: false,
    });
  });

  beforeEach(async () => {
    await redisClient.flushall();

    // Mock RedisClient to use our test instance
    vi.mocked(RedisClient.get).mockReturnValue(redisClient);
  });

  afterAll(async () => {
    if (redisClient) {
      redisClient.disconnect();
    }
    if (redisServer) {
      await redisServer.stop();
    }
  });

  describe('getMatchAssignment', () => {
    it('should return null when no assignment exists', async () => {
      const result =
        await MatchAssignmentService.getMatchAssignment('socketId1');
      expect(result).toBeNull();
    });

    it('should return match assignment when it exists', async () => {
      const matchData = { roomId: 'room123', partnerSocketId: 'partner456' };
      await MatchAssignmentService._setMatchAssignment('socketId1', matchData);

      const result =
        await MatchAssignmentService.getMatchAssignment('socketId1');
      expect(result).toEqual(matchData);
    });

    it('should handle JSON parsing errors gracefully', async () => {
      // Manually set invalid JSON
      await redisClient.hset(
        MatchAssignmentService.MATCH_ASSIGNMENT_KEY,
        'socketId1',
        'invalid-json',
      );

      const result =
        await MatchAssignmentService.getMatchAssignment('socketId1');
      expect(result).toBeNull();
    });
  });

  describe('cleanupMatchAssignments', () => {
    it('should cleanup assignments for both users in a match', async () => {
      const matchData1 = { roomId: 'room123', partnerSocketId: 'socket2' };
      const matchData2 = { roomId: 'room123', partnerSocketId: 'socket1' };

      await MatchAssignmentService._setMatchAssignment('socket1', matchData1);
      await MatchAssignmentService._setMatchAssignment('socket2', matchData2);

      const result =
        await MatchAssignmentService.cleanupMatchAssignments('socket1');

      expect(result).toEqual(matchData1);

      // Verify both assignments are removed
      const assignment1 =
        await MatchAssignmentService.getMatchAssignment('socket1');
      const assignment2 =
        await MatchAssignmentService.getMatchAssignment('socket2');

      expect(assignment1).toBeNull();
      expect(assignment2).toBeNull();
    });

    it('should return null when no assignment exists for cleanup', async () => {
      const result =
        await MatchAssignmentService.cleanupMatchAssignments('nonexistent');
      expect(result).toBeNull();
    });

    it('should handle partial cleanup gracefully', async () => {
      const matchData = { roomId: 'room123', partnerSocketId: 'nonexistent' };
      await MatchAssignmentService._setMatchAssignment('socket1', matchData);

      const result =
        await MatchAssignmentService.cleanupMatchAssignments('socket1');
      expect(result).toEqual(matchData);

      // Original assignment should be removed even if partner doesn't exist
      const assignment =
        await MatchAssignmentService.getMatchAssignment('socket1');
      expect(assignment).toBeNull();
    });
  });

  describe('_setMatchAssignment', () => {
    it('should set match assignment correctly', async () => {
      const matchData = { roomId: 'room123', partnerSocketId: 'partner456' };
      await MatchAssignmentService._setMatchAssignment('socketId1', matchData);

      const result =
        await MatchAssignmentService.getMatchAssignment('socketId1');
      expect(result).toEqual(matchData);
    });

    it('should overwrite existing assignment', async () => {
      const oldMatchData = { roomId: 'room123', partnerSocketId: 'partner456' };
      const newMatchData = { roomId: 'room789', partnerSocketId: 'partner999' };

      await MatchAssignmentService._setMatchAssignment(
        'socketId1',
        oldMatchData,
      );
      await MatchAssignmentService._setMatchAssignment(
        'socketId1',
        newMatchData,
      );

      const result =
        await MatchAssignmentService.getMatchAssignment('socketId1');
      expect(result).toEqual(newMatchData);
    });
  });

  describe('_removeMatchAssignment', () => {
    it('should remove match assignment', async () => {
      const matchData = { roomId: 'room123', partnerSocketId: 'partner456' };
      await MatchAssignmentService._setMatchAssignment('socketId1', matchData);

      await MatchAssignmentService._removeMatchAssignment(
        'socketId1',
        'partner456',
      );

      const result =
        await MatchAssignmentService.getMatchAssignment('socketId1');
      expect(result).toBeNull();
    });

    it('should handle removing non-existent assignment', async () => {
      // Should not throw error
      await MatchAssignmentService._removeMatchAssignment(
        'nonexistent',
        'nonexistent2',
      );

      const result =
        await MatchAssignmentService.getMatchAssignment('nonexistent');
      expect(result).toBeNull();
    });
  });
});
