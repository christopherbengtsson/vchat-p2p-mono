import { TimeUtils } from '../TimeUtils.js';

describe('TimeUtils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getCurrentTimeAsScore', () => {
    it('should return current time in seconds rounded to nearest second', () => {
      // Test case 1: Exact second boundary
      vi.setSystemTime(new Date('2024-01-01T12:00:00.000Z'));
      expect(TimeUtils.getCurrentTimeAsScore()).toBe(1704110400);

      // Test case 2: Rounding down (< 500ms)
      vi.setSystemTime(new Date('2024-01-01T12:00:00.400Z'));
      expect(TimeUtils.getCurrentTimeAsScore()).toBe(1704110400);

      // Test case 3: Rounding up (>= 500ms)
      vi.setSystemTime(new Date('2024-01-01T12:00:00.600Z'));
      expect(TimeUtils.getCurrentTimeAsScore()).toBe(1704110401);
    });

    it('should provide consistent scores for time ranges within same second', () => {
      const baseTime = new Date('2024-01-01T12:00:00.000Z');

      // All times within the same second should round to the same score
      const times = [0, 100, 200, 300, 400, 499];
      const expectedScore = 1704110400;

      times.forEach((ms) => {
        vi.setSystemTime(new Date(baseTime.getTime() + ms));
        expect(TimeUtils.getCurrentTimeAsScore()).toBe(expectedScore);
      });
    });

    it('should maintain FIFO ordering for matchmaking queue', () => {
      // Simulate users joining queue at different times
      const scores: number[] = [];

      vi.setSystemTime(new Date('2024-01-01T12:00:00.000Z'));
      scores.push(TimeUtils.getCurrentTimeAsScore());

      vi.setSystemTime(new Date('2024-01-01T12:00:01.000Z'));
      scores.push(TimeUtils.getCurrentTimeAsScore());

      vi.setSystemTime(new Date('2024-01-01T12:00:02.000Z'));
      scores.push(TimeUtils.getCurrentTimeAsScore());

      // Scores should be strictly increasing for FIFO ordering
      expect(scores[0]).toBeLessThan(scores[1]);
      expect(scores[1]).toBeLessThan(scores[2]);
      expect(scores[2] - scores[0]).toBe(2); // 2 second difference
    });

    it('should optimize Redis memory usage through rounding', () => {
      // Multiple users joining in rapid succession should get same score
      const scores: number[] = [];
      const baseTime = new Date('2024-01-01T12:00:00.100Z');

      // Simulate 5 users joining within 400ms window
      for (let i = 0; i < 5; i++) {
        vi.setSystemTime(new Date(baseTime.getTime() + i * 80)); // 80ms intervals
        scores.push(TimeUtils.getCurrentTimeAsScore());
      }

      // All should have same score due to rounding (all < 500ms from second boundary)
      const uniqueScores = new Set(scores);
      expect(uniqueScores.size).toBe(1);
      expect(scores[0]).toBe(1704110400);
    });
  });
});
