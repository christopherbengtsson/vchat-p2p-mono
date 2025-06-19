import { REDIS_KEY } from '../../model/RedisKey.js';
import { AssignmentService } from '../assignment/AssignmentService.js';

describe('AssignmentService', () => {
  describe('getMatchAssignment', () => {
    it('should return null when no assignment exists', async () => {
      const result = await AssignmentService.getMatchAssignment('socketId1');
      expect(result).toBeNull();
    });

    it('should return match assignment when it exists', async () => {
      const matchData = { roomId: 'room123', partnerSocketId: 'partner456' };
      await AssignmentService._setMatchAssignment('socketId1', matchData);

      const result = await AssignmentService.getMatchAssignment('socketId1');
      expect(result).toEqual(matchData);
    });

    it('should handle JSON parsing errors gracefully', async () => {
      // Manually set invalid JSON
      await globalThis.redisClient.hset(
        REDIS_KEY.MATCH_ASSIGNMENT_KEY,
        'socketId1',
        'invalid-json',
      );

      const result = await AssignmentService.getMatchAssignment('socketId1');
      expect(result).toBeNull();
    });
  });

  describe('cleanupMatchAssignments', () => {
    it('should cleanup assignments for both users in a match', async () => {
      const matchData1 = { roomId: 'room123', partnerSocketId: 'socket2' };
      const matchData2 = { roomId: 'room123', partnerSocketId: 'socket1' };

      await AssignmentService._setMatchAssignment('socket1', matchData1);
      await AssignmentService._setMatchAssignment('socket2', matchData2);

      const result = await AssignmentService.cleanupMatchAssignments('socket1');

      expect(result).toEqual(matchData1);

      // Verify both assignments are removed
      const assignment1 = await AssignmentService.getMatchAssignment('socket1');
      const assignment2 = await AssignmentService.getMatchAssignment('socket2');

      expect(assignment1).toBeNull();
      expect(assignment2).toBeNull();
    });

    it('should return null when no assignment exists for cleanup', async () => {
      const result =
        await AssignmentService.cleanupMatchAssignments('nonexistent');
      expect(result).toBeNull();
    });

    it('should handle partial cleanup gracefully', async () => {
      const matchData = { roomId: 'room123', partnerSocketId: 'nonexistent' };
      await AssignmentService._setMatchAssignment('socket1', matchData);

      const result = await AssignmentService.cleanupMatchAssignments('socket1');
      expect(result).toEqual(matchData);

      // Original assignment should be removed even if partner doesn't exist
      const assignment = await AssignmentService.getMatchAssignment('socket1');
      expect(assignment).toBeNull();
    });
  });

  describe('_setMatchAssignment', () => {
    it('should set match assignment correctly', async () => {
      const matchData = { roomId: 'room123', partnerSocketId: 'partner456' };
      await AssignmentService._setMatchAssignment('socketId1', matchData);

      const result = await AssignmentService.getMatchAssignment('socketId1');
      expect(result).toEqual(matchData);
    });

    it('should overwrite existing assignment', async () => {
      const oldMatchData = { roomId: 'room123', partnerSocketId: 'partner456' };
      const newMatchData = { roomId: 'room789', partnerSocketId: 'partner999' };

      await AssignmentService._setMatchAssignment('socketId1', oldMatchData);
      await AssignmentService._setMatchAssignment('socketId1', newMatchData);

      const result = await AssignmentService.getMatchAssignment('socketId1');
      expect(result).toEqual(newMatchData);
    });
  });

  describe('_removeMatchAssignment', () => {
    it('should remove match assignment', async () => {
      const matchData = { roomId: 'room123', partnerSocketId: 'partner456' };
      await AssignmentService._setMatchAssignment('socketId1', matchData);

      await AssignmentService._removeMatchAssignment('socketId1', 'partner456');

      const result = await AssignmentService.getMatchAssignment('socketId1');
      expect(result).toBeNull();
    });

    it('should handle removing non-existent assignment', async () => {
      // Should not throw error
      await AssignmentService._removeMatchAssignment(
        'nonexistent',
        'nonexistent2',
      );

      const result = await AssignmentService.getMatchAssignment('nonexistent');
      expect(result).toBeNull();
    });
  });
});
