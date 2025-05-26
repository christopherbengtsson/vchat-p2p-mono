import { log } from '../../../../common/util/logger.js';
import { PerformanceMetrics } from '../PerformanceMetrics.js';
import type { ProcessingMetrics } from '../../model/ProcessingMetrics.js';

// Mock the logger module
vi.mock('../../../../../../common/util/logger.js', () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PerformanceMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createInitialMetrics', () => {
    it('should create metrics with all fields initialized to zero except startTime', () => {
      const beforeTime = Date.now();
      const metrics = PerformanceMetrics.createInitialMetrics();
      const afterTime = Date.now();

      expect(metrics.usersProcessed).toBe(0);
      expect(metrics.matchesCreated).toBe(0);
      expect(metrics.redisOperations).toBe(0);
      expect(metrics.ignoredPairsChecked).toBe(0);
      expect(metrics.processTimeMs).toBe(0);
      expect(metrics.startTime).toBeGreaterThanOrEqual(beforeTime);
      expect(metrics.startTime).toBeLessThanOrEqual(afterTime);
    });

    it('should create a new object each time', () => {
      const metrics1 = PerformanceMetrics.createInitialMetrics();
      const metrics2 = PerformanceMetrics.createInitialMetrics();

      expect(metrics1).not.toBe(metrics2);
      expect(metrics1).toEqual(metrics2);
    });
  });

  describe('finalizeMetrics', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should calculate processing time from start time', () => {
      const startTime = Date.now();

      // Advance time by 100ms
      vi.advanceTimersByTime(100);

      const metrics: ProcessingMetrics = {
        startTime,
        usersProcessed: 5,
        matchesCreated: 2,
        redisOperations: 3,
        ignoredPairsChecked: 10,
        processTimeMs: 0,
      };

      const finalizedMetrics = PerformanceMetrics.finalizeMetrics(metrics);

      expect(finalizedMetrics.usersProcessed).toBe(5);
      expect(finalizedMetrics.matchesCreated).toBe(2);
      expect(finalizedMetrics.redisOperations).toBe(3);
      expect(finalizedMetrics.ignoredPairsChecked).toBe(10);
      expect(finalizedMetrics.processTimeMs).toBe(100);
      expect(finalizedMetrics.startTime).toBe(startTime);
    });

    it('should handle zero processing time', () => {
      const startTime = Date.now();

      // Don't advance time

      const metrics: ProcessingMetrics = {
        startTime,
        usersProcessed: 0,
        matchesCreated: 0,
        redisOperations: 1,
        ignoredPairsChecked: 0,
        processTimeMs: 0,
      };

      const finalizedMetrics = PerformanceMetrics.finalizeMetrics(metrics);

      expect(finalizedMetrics.processTimeMs).toBe(0);
    });

    it('should preserve all other metric values', () => {
      const startTime = Date.now();
      vi.advanceTimersByTime(50);

      const metrics: ProcessingMetrics = {
        startTime,
        usersProcessed: 100,
        matchesCreated: 50,
        redisOperations: 25,
        ignoredPairsChecked: 200,
        processTimeMs: 0,
      };

      const finalizedMetrics = PerformanceMetrics.finalizeMetrics(metrics);

      expect(finalizedMetrics.usersProcessed).toBe(100);
      expect(finalizedMetrics.matchesCreated).toBe(50);
      expect(finalizedMetrics.redisOperations).toBe(25);
      expect(finalizedMetrics.ignoredPairsChecked).toBe(200);
      expect(finalizedMetrics.processTimeMs).toBe(50);
    });
  });

  describe('logPerformanceMetrics', () => {
    it('should log metrics with success message', () => {
      const metrics: ProcessingMetrics = {
        startTime: Date.now() - 150,
        usersProcessed: 10,
        matchesCreated: 5,
        redisOperations: 8,
        ignoredPairsChecked: 20,
        processTimeMs: 150,
      };

      const message = 'Processing completed successfully';

      PerformanceMetrics.logPerformanceMetrics(metrics, message);

      expect(log.info).toHaveBeenCalledWith(
        expect.objectContaining({
          status: message,
          processTimeMs: 150,
          usersProcessed: 10,
          matchesCreated: 5,
          redisOperations: 8,
          ignoredPairsChecked: 20,
        }),
        '[MatchmakingProcessor] Performance metrics',
      );
    });

    it('should log metrics with error message', () => {
      const metrics: ProcessingMetrics = {
        startTime: Date.now() - 75,
        usersProcessed: 5,
        matchesCreated: 0,
        redisOperations: 3,
        ignoredPairsChecked: 10,
        processTimeMs: 75,
      };

      const message = 'Critical error: Redis connection failed';

      PerformanceMetrics.logPerformanceMetrics(metrics, message);

      expect(log.info).toHaveBeenCalledWith(
        expect.objectContaining({
          status: message,
          processTimeMs: 75,
          usersProcessed: 5,
          matchesCreated: 0,
          redisOperations: 3,
          ignoredPairsChecked: 10,
        }),
        '[MatchmakingProcessor] Performance metrics',
      );
    });

    it('should not log empty metrics', () => {
      const metrics: ProcessingMetrics = {
        startTime: Date.now(),
        usersProcessed: 0,
        matchesCreated: 0,
        redisOperations: 0,
        ignoredPairsChecked: 0,
        processTimeMs: 0,
      };

      const message = 'No users to process';

      PerformanceMetrics.logPerformanceMetrics(metrics, message);

      expect(log.debug).not.toHaveBeenCalled();
    });

    it('should handle very large numbers', () => {
      const metrics: ProcessingMetrics = {
        startTime: Date.now() - 60000,
        usersProcessed: 999999,
        matchesCreated: 499999,
        redisOperations: 100000,
        ignoredPairsChecked: 2000000,
        processTimeMs: 60000, // 1 minute
      };

      const message = 'Large batch processing completed';

      PerformanceMetrics.logPerformanceMetrics(metrics, message);

      expect(log.error).toHaveBeenCalledWith(
        expect.objectContaining({
          status: message,
          processTimeMs: 60000,
          usersProcessed: 999999,
          matchesCreated: 499999,
          redisOperations: 100000,
          ignoredPairsChecked: 2000000,
        }),
        '[MatchmakingProcessor] Performance metrics',
      );
    });

    it('should handle negative processing time (edge case)', () => {
      const metrics: ProcessingMetrics = {
        startTime: Date.now() + 5,
        usersProcessed: 5,
        matchesCreated: 2,
        redisOperations: 3,
        ignoredPairsChecked: 10,
        processTimeMs: -5, // Edge case - shouldn't happen in practice
      };

      const message = 'Edge case processing';

      PerformanceMetrics.logPerformanceMetrics(metrics, message);

      expect(log.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          status: message,
          processTimeMs: -5,
          usersProcessed: 5,
          matchesCreated: 2,
          redisOperations: 3,
          ignoredPairsChecked: 10,
        }),
        '[MatchmakingProcessor] Performance metrics',
      );
    });
  });

  describe('Integration scenarios', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should handle complete workflow: create -> update -> finalize -> log', () => {
      // Create initial metrics
      const metrics = PerformanceMetrics.createInitialMetrics();
      const startTime = metrics.startTime;

      // Simulate processing
      metrics.usersProcessed = 8;
      metrics.matchesCreated = 4;
      metrics.redisOperations = 6;
      metrics.ignoredPairsChecked = 15;

      // Advance time
      vi.advanceTimersByTime(200);

      // Finalize metrics
      const finalMetrics = PerformanceMetrics.finalizeMetrics(metrics);

      // Log metrics
      PerformanceMetrics.logPerformanceMetrics(
        finalMetrics,
        'Workflow completed',
      );

      // Verify final state
      expect(finalMetrics.usersProcessed).toBe(8);
      expect(finalMetrics.matchesCreated).toBe(4);
      expect(finalMetrics.redisOperations).toBe(6);
      expect(finalMetrics.ignoredPairsChecked).toBe(15);
      expect(finalMetrics.processTimeMs).toBe(200);
      expect(finalMetrics.startTime).toBe(startTime);

      expect(log.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'Workflow completed',
          processTimeMs: 200,
          usersProcessed: 8,
          matchesCreated: 4,
          redisOperations: 6,
          ignoredPairsChecked: 15,
        }),
        '[MatchmakingProcessor] Performance metrics',
      );
    });

    it('should handle metrics for empty queue scenario', () => {
      const metrics = PerformanceMetrics.createInitialMetrics();

      // Only one Redis operation to check queue
      metrics.redisOperations = 1;

      // Advance minimal time
      vi.advanceTimersByTime(5);

      const finalMetrics = PerformanceMetrics.finalizeMetrics(metrics);
      PerformanceMetrics.logPerformanceMetrics(
        finalMetrics,
        'Insufficient users for matching',
      );

      expect(finalMetrics.usersProcessed).toBe(0);
      expect(finalMetrics.matchesCreated).toBe(0);
      expect(finalMetrics.redisOperations).toBe(1);
      expect(finalMetrics.processTimeMs).toBe(5);
    });

    it('should handle metrics for high-load scenario', () => {
      const metrics = PerformanceMetrics.createInitialMetrics();

      // Simulate high load
      metrics.usersProcessed = 1000;
      metrics.matchesCreated = 500;
      metrics.redisOperations = 100; // Multiple batches
      metrics.ignoredPairsChecked = 2000;

      // Longer processing time for high load
      vi.advanceTimersByTime(5000);

      const finalMetrics = PerformanceMetrics.finalizeMetrics(metrics);
      PerformanceMetrics.logPerformanceMetrics(
        finalMetrics,
        'High load processing completed',
      );

      expect(finalMetrics.processTimeMs).toBe(5000);
      expect(log.error).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'High load processing completed',
          processTimeMs: 5000,
          usersProcessed: 1000,
          matchesCreated: 500,
          redisOperations: 100,
          ignoredPairsChecked: 2000,
        }),
        '[MatchmakingProcessor] Performance metrics',
      );
    });
  });
});
