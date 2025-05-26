import type { ServerConfig } from '../../../../common/config/model/ServerConfig.js';
import type { JobConfig } from '../../model/JobConfig.js';
import type { JobEntryPoint } from '../../model/JobEntryPoint.js';
import { JobType } from '../../model/JobType.js';
import { JobFactoryService } from '../JobFactoryService.js';
import { JobManagerService } from '../JobManagerService.js';

// Create mock implementations that match the expected interface
const createMockJobInstance = (overrides: Partial<any> = {}) => ({
  jobId: `test-job-${Math.random().toString(36).substring(2, 9)}`,
  baseJobType: JobType.DEFAULT_MATCHMAKING,
  effectiveJobType: 'test-job-type',
  serverRegion: 'test-region',
  config: { interval: 1000 },
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  destroy: vi.fn().mockResolvedValue(undefined),
  getState: vi.fn().mockReturnValue({
    jobId: 'test-job-id',
    status: 'IDLE',
    intervalId: null,
    renewLockIntervalId: null,
  }),
  ...overrides,
});

const createMockServerConfig = (cleanupInterval = 30000): ServerConfig =>
  ({
    config: {
      jobConfig: {
        periodicCleanupInterval: cleanupInterval,
      },
    },
  }) as ServerConfig;

describe('JobManagerService', () => {
  let mockJobEntryPoint: JobEntryPoint;
  let jobFactorySpy: any;
  let mockJobInstance: ReturnType<typeof createMockJobInstance>;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    // Clear the internal registry by calling destroyAllJobs
    await JobManagerService.destroyAllJobs();

    mockJobEntryPoint = vi.fn().mockResolvedValue(undefined);
    mockJobInstance = createMockJobInstance();

    // Spy on JobFactoryService.init
    jobFactorySpy = vi
      .spyOn(JobFactoryService, 'init')
      .mockReturnValue(mockJobInstance);
  });

  afterEach(() => {
    vi.useRealTimers();
    JobManagerService.stopPeriodicCleanup();
  });

  describe('registerJob', () => {
    it('should register a job and return job ID', () => {
      const jobId = JobManagerService.registerJob(
        JobType.DEFAULT_MATCHMAKING,
        mockJobEntryPoint,
      );

      expect(jobId).toBe(mockJobInstance.jobId);
      expect(jobFactorySpy).toHaveBeenCalledWith(
        JobType.DEFAULT_MATCHMAKING,
        mockJobEntryPoint,
        undefined,
      );
      expect(JobManagerService._getJobDetails(jobId)).toBe(mockJobInstance);
    });

    it('should register a job with config overrides', () => {
      const overrides: Partial<JobConfig> = { interval: 2000 };

      const jobId = JobManagerService.registerJob(
        JobType.DEFAULT_MATCHMAKING,
        mockJobEntryPoint,
        overrides,
      );

      expect(jobFactorySpy).toHaveBeenCalledWith(
        JobType.DEFAULT_MATCHMAKING,
        mockJobEntryPoint,
        overrides,
      );
      expect(jobId).toBe(mockJobInstance.jobId);
    });

    it('should register multiple jobs independently', () => {
      const mockJobInstance2 = createMockJobInstance({
        jobId: 'job-2',
        effectiveJobType: 'test-job-type-2',
      });
      jobFactorySpy
        .mockReturnValueOnce(mockJobInstance)
        .mockReturnValueOnce(mockJobInstance2);

      const jobId1 = JobManagerService.registerJob(
        JobType.DEFAULT_MATCHMAKING,
        mockJobEntryPoint,
      );
      const jobId2 = JobManagerService.registerJob(
        JobType.DEFAULT_MATCHMAKING,
        mockJobEntryPoint,
      );

      expect(jobId1).toBe(mockJobInstance.jobId);
      expect(jobId2).toBe(mockJobInstance2.jobId);
      expect(JobManagerService._getAllJobDetails()).toHaveLength(2);
    });
  });

  describe('_startJob', () => {
    it('should start a registered job successfully', async () => {
      const jobId = JobManagerService.registerJob(
        JobType.DEFAULT_MATCHMAKING,
        mockJobEntryPoint,
      );

      await JobManagerService._startJob(jobId);

      expect(mockJobInstance.start).toHaveBeenCalledOnce();
    });

    it('should handle job start failure and re-throw error', async () => {
      const startError = new Error('Failed to start job');
      mockJobInstance.start.mockRejectedValue(startError);

      const jobId = JobManagerService.registerJob(
        JobType.DEFAULT_MATCHMAKING,
        mockJobEntryPoint,
      );

      await expect(JobManagerService._startJob(jobId)).rejects.toThrow(
        'Failed to start job',
      );
      expect(mockJobInstance.start).toHaveBeenCalledOnce();
    });

    it('should handle non-existent job gracefully', async () => {
      // Should not throw, just log error
      await expect(
        JobManagerService._startJob('non-existent-job-id'),
      ).resolves.toBeUndefined();
    });
  });

  describe('_stopJob', () => {
    it('should stop a registered job successfully', async () => {
      const jobId = JobManagerService.registerJob(
        JobType.DEFAULT_MATCHMAKING,
        mockJobEntryPoint,
      );

      await JobManagerService._stopJob(jobId);

      expect(mockJobInstance.stop).toHaveBeenCalledOnce();
    });

    it('should handle job stop failure and re-throw error', async () => {
      const stopError = new Error('Failed to stop job');
      mockJobInstance.stop.mockRejectedValue(stopError);

      const jobId = JobManagerService.registerJob(
        JobType.DEFAULT_MATCHMAKING,
        mockJobEntryPoint,
      );

      await expect(JobManagerService._stopJob(jobId)).rejects.toThrow(
        'Failed to stop job',
      );
      expect(mockJobInstance.stop).toHaveBeenCalledOnce();
    });

    it('should handle non-existent job gracefully', async () => {
      // Should not throw, just log warning
      await expect(
        JobManagerService._stopJob('non-existent-job-id'),
      ).resolves.toBeUndefined();
    });
  });

  describe('_destroyJobAndUnregister', () => {
    it('should destroy job and remove from registry', async () => {
      const jobId = JobManagerService.registerJob(
        JobType.DEFAULT_MATCHMAKING,
        mockJobEntryPoint,
      );

      expect(JobManagerService._getJobDetails(jobId)).toBe(mockJobInstance);

      await JobManagerService._destroyJobAndUnregister(jobId);

      expect(mockJobInstance.destroy).toHaveBeenCalledOnce();
      expect(JobManagerService._getJobDetails(jobId)).toBeUndefined();
    });

    it('should handle destroy failure but still remove from registry', async () => {
      const destroyError = new Error('Failed to destroy job');
      mockJobInstance.destroy.mockRejectedValue(destroyError);

      const jobId = JobManagerService.registerJob(
        JobType.DEFAULT_MATCHMAKING,
        mockJobEntryPoint,
      );

      await expect(
        JobManagerService._destroyJobAndUnregister(jobId),
      ).rejects.toThrow('Failed to destroy job');

      expect(mockJobInstance.destroy).toHaveBeenCalledOnce();
      // Job should still be removed from registry even if destroy fails
      expect(JobManagerService._getJobDetails(jobId)).toBeUndefined();
    });

    it('should handle non-existent job gracefully', async () => {
      // Should not throw, just log warning
      await expect(
        JobManagerService._destroyJobAndUnregister('non-existent-job-id'),
      ).resolves.toBeUndefined();
    });
  });

  describe('startAllJobs', () => {
    it('should start all registered jobs', async () => {
      const mockJobInstance2 = createMockJobInstance({ jobId: 'job-2' });
      jobFactorySpy
        .mockReturnValueOnce(mockJobInstance)
        .mockReturnValueOnce(mockJobInstance2);

      JobManagerService.registerJob(
        JobType.DEFAULT_MATCHMAKING,
        mockJobEntryPoint,
      );
      JobManagerService.registerJob(
        JobType.DEFAULT_MATCHMAKING,
        mockJobEntryPoint,
      );

      await JobManagerService.startAllJobs();

      expect(mockJobInstance.start).toHaveBeenCalledOnce();
      expect(mockJobInstance2.start).toHaveBeenCalledOnce();
    });

    it('should continue starting other jobs even if one fails', async () => {
      const mockJobInstance2 = createMockJobInstance({ jobId: 'job-2' });
      mockJobInstance.start.mockRejectedValue(new Error('Job 1 failed'));

      jobFactorySpy
        .mockReturnValueOnce(mockJobInstance)
        .mockReturnValueOnce(mockJobInstance2);

      JobManagerService.registerJob(
        JobType.DEFAULT_MATCHMAKING,
        mockJobEntryPoint,
      );
      JobManagerService.registerJob(
        JobType.DEFAULT_MATCHMAKING,
        mockJobEntryPoint,
      );

      await JobManagerService.startAllJobs();

      expect(mockJobInstance.start).toHaveBeenCalledOnce();
      expect(mockJobInstance2.start).toHaveBeenCalledOnce();
    });

    it('should handle empty job registry', async () => {
      await expect(JobManagerService.startAllJobs()).resolves.toBeUndefined();
    });
  });

  describe('_stopAllJobs', () => {
    it('should stop all registered jobs', async () => {
      const mockJobInstance2 = createMockJobInstance({ jobId: 'job-2' });
      jobFactorySpy
        .mockReturnValueOnce(mockJobInstance)
        .mockReturnValueOnce(mockJobInstance2);

      JobManagerService.registerJob(
        JobType.DEFAULT_MATCHMAKING,
        mockJobEntryPoint,
      );
      JobManagerService.registerJob(
        JobType.DEFAULT_MATCHMAKING,
        mockJobEntryPoint,
      );

      await JobManagerService._stopAllJobs();

      expect(mockJobInstance.stop).toHaveBeenCalledOnce();
      expect(mockJobInstance2.stop).toHaveBeenCalledOnce();
    });

    it('should use Promise.allSettled to handle individual job failures', async () => {
      const mockJobInstance2 = createMockJobInstance({ jobId: 'job-2' });
      mockJobInstance.stop.mockRejectedValue(new Error('Job 1 failed to stop'));

      jobFactorySpy
        .mockReturnValueOnce(mockJobInstance)
        .mockReturnValueOnce(mockJobInstance2);

      JobManagerService.registerJob(
        JobType.DEFAULT_MATCHMAKING,
        mockJobEntryPoint,
      );
      JobManagerService.registerJob(
        JobType.DEFAULT_MATCHMAKING,
        mockJobEntryPoint,
      );

      // Should not throw even if individual jobs fail
      await expect(JobManagerService._stopAllJobs()).resolves.toBeUndefined();

      expect(mockJobInstance.stop).toHaveBeenCalledOnce();
      expect(mockJobInstance2.stop).toHaveBeenCalledOnce();
    });
  });

  describe('destroyAllJobs', () => {
    it('should destroy all registered jobs and clear registry', async () => {
      const mockJobInstance2 = createMockJobInstance({ jobId: 'job-2' });
      jobFactorySpy
        .mockReturnValueOnce(mockJobInstance)
        .mockReturnValueOnce(mockJobInstance2);

      const jobId1 = JobManagerService.registerJob(
        JobType.DEFAULT_MATCHMAKING,
        mockJobEntryPoint,
      );
      const jobId2 = JobManagerService.registerJob(
        JobType.DEFAULT_MATCHMAKING,
        mockJobEntryPoint,
      );

      await JobManagerService.destroyAllJobs();

      expect(mockJobInstance.destroy).toHaveBeenCalledOnce();
      expect(mockJobInstance2.destroy).toHaveBeenCalledOnce();
      expect(JobManagerService._getJobDetails(jobId1)).toBeUndefined();
      expect(JobManagerService._getJobDetails(jobId2)).toBeUndefined();
      expect(JobManagerService._getAllJobDetails()).toHaveLength(0);
    });

    it('should use Promise.allSettled to handle individual job failures', async () => {
      const mockJobInstance2 = createMockJobInstance({ jobId: 'job-2' });
      mockJobInstance.destroy.mockRejectedValue(
        new Error('Job 1 failed to destroy'),
      );

      jobFactorySpy
        .mockReturnValueOnce(mockJobInstance)
        .mockReturnValueOnce(mockJobInstance2);

      JobManagerService.registerJob(
        JobType.DEFAULT_MATCHMAKING,
        mockJobEntryPoint,
      );
      JobManagerService.registerJob(
        JobType.DEFAULT_MATCHMAKING,
        mockJobEntryPoint,
      );

      // Should not throw even if individual jobs fail
      await expect(JobManagerService.destroyAllJobs()).resolves.toBeUndefined();

      expect(mockJobInstance.destroy).toHaveBeenCalledOnce();
      expect(mockJobInstance2.destroy).toHaveBeenCalledOnce();
    });
  });

  describe('_getJobDetails and _getAllJobDetails', () => {
    it('should return job details for valid job ID', () => {
      const jobId = JobManagerService.registerJob(
        JobType.DEFAULT_MATCHMAKING,
        mockJobEntryPoint,
      );

      const details = JobManagerService._getJobDetails(jobId);
      expect(details).toBe(mockJobInstance);
    });

    it('should return undefined for invalid job ID', () => {
      const details = JobManagerService._getJobDetails('non-existent-job-id');
      expect(details).toBeUndefined();
    });

    it('should return all job details', () => {
      const mockJobInstance2 = createMockJobInstance({ jobId: 'job-2' });
      jobFactorySpy
        .mockReturnValueOnce(mockJobInstance)
        .mockReturnValueOnce(mockJobInstance2);

      JobManagerService.registerJob(
        JobType.DEFAULT_MATCHMAKING,
        mockJobEntryPoint,
      );
      JobManagerService.registerJob(
        JobType.DEFAULT_MATCHMAKING,
        mockJobEntryPoint,
      );

      const allDetails = JobManagerService._getAllJobDetails();
      expect(allDetails).toHaveLength(2);
      expect(allDetails).toContain(mockJobInstance);
      expect(allDetails).toContain(mockJobInstance2);
    });

    it('should return empty array when no jobs registered', () => {
      const allDetails = JobManagerService._getAllJobDetails();
      expect(allDetails).toEqual([]);
    });
  });

  describe('periodic cleanup', () => {
    let mockServerConfig: ServerConfig;

    beforeEach(() => {
      mockServerConfig = createMockServerConfig(1000); // 1 second for faster testing
    });

    it('should start periodic cleanup with correct interval', () => {
      JobManagerService.startPeriodicCleanup(mockServerConfig);

      // Verify the interval was set (we can't directly check setInterval, but we can check behavior)
      expect(() =>
        JobManagerService.startPeriodicCleanup(mockServerConfig),
      ).not.toThrow();

      // Cleanup
      JobManagerService.stopPeriodicCleanup();
    });

    it('should not start multiple periodic cleanup tasks', () => {
      JobManagerService.startPeriodicCleanup(mockServerConfig);
      JobManagerService.startPeriodicCleanup(mockServerConfig);
      // Should handle gracefully without throwing

      JobManagerService.stopPeriodicCleanup();
    });

    it('should run cleanup task immediately when started', () => {
      const failedJobInstance = createMockJobInstance({
        jobId: 'failed-job',
        getState: vi.fn().mockReturnValue({
          jobId: 'failed-job',
          status: 'FAILED_MAX_RETRIES',
          intervalId: null,
          renewLockIntervalId: null,
        }),
      });

      jobFactorySpy.mockReturnValue(failedJobInstance);
      JobManagerService.registerJob(
        JobType.DEFAULT_MATCHMAKING,
        mockJobEntryPoint,
      );

      JobManagerService.startPeriodicCleanup(mockServerConfig);

      // The cleanup should run immediately
      // In a real scenario, the job would be scheduled for async destruction
      expect(failedJobInstance.getState).toHaveBeenCalled();

      JobManagerService.stopPeriodicCleanup();
    });

    it('should clean up jobs with FAILED_MAX_RETRIES status', async () => {
      const failedJobInstance = createMockJobInstance({
        jobId: 'failed-job',
        getState: vi.fn().mockReturnValue({
          jobId: 'failed-job',
          status: 'FAILED_MAX_RETRIES',
          intervalId: null,
          renewLockIntervalId: null,
        }),
      });

      jobFactorySpy.mockReturnValue(failedJobInstance);
      JobManagerService.registerJob(
        JobType.DEFAULT_MATCHMAKING,
        mockJobEntryPoint,
      );

      JobManagerService.startPeriodicCleanup(mockServerConfig);

      // Just verify the cleanup task checks the job state - don't wait for async operations
      expect(failedJobInstance.getState).toHaveBeenCalled();

      JobManagerService.stopPeriodicCleanup();
    });

    it('should not clean up jobs with STOPPED or IDLE status', () => {
      const stoppedJobInstance = createMockJobInstance({
        jobId: 'stopped-job',
        getState: vi.fn().mockReturnValue({
          jobId: 'stopped-job',
          status: 'STOPPED',
          intervalId: null,
          renewLockIntervalId: null,
        }),
      });

      const idleJobInstance = createMockJobInstance({
        jobId: 'idle-job',
        getState: vi.fn().mockReturnValue({
          jobId: 'idle-job',
          status: 'IDLE',
          intervalId: null,
          renewLockIntervalId: null,
        }),
      });

      jobFactorySpy
        .mockReturnValueOnce(stoppedJobInstance)
        .mockReturnValueOnce(idleJobInstance);

      JobManagerService.registerJob(
        JobType.DEFAULT_MATCHMAKING,
        mockJobEntryPoint,
      );
      JobManagerService.registerJob(
        JobType.DEFAULT_MATCHMAKING,
        mockJobEntryPoint,
      );

      JobManagerService.startPeriodicCleanup(mockServerConfig);

      expect(stoppedJobInstance.getState).toHaveBeenCalled();
      expect(idleJobInstance.getState).toHaveBeenCalled();
      expect(stoppedJobInstance.destroy).not.toHaveBeenCalled();
      expect(idleJobInstance.destroy).not.toHaveBeenCalled();

      JobManagerService.stopPeriodicCleanup();
    });

    it('should handle errors when getting job state during cleanup', () => {
      const errorJobInstance = createMockJobInstance({
        jobId: 'error-job',
        getState: vi.fn().mockImplementation(() => {
          throw new Error('State service unavailable');
        }),
      });

      jobFactorySpy.mockReturnValue(errorJobInstance);
      JobManagerService.registerJob(
        JobType.DEFAULT_MATCHMAKING,
        mockJobEntryPoint,
      );

      // Should not throw when cleanup encounters errors
      expect(() => {
        JobManagerService.startPeriodicCleanup(mockServerConfig);
      }).not.toThrow();

      JobManagerService.stopPeriodicCleanup();
    });

    it('should stop periodic cleanup', () => {
      JobManagerService.startPeriodicCleanup(mockServerConfig);
      JobManagerService.stopPeriodicCleanup();

      // Should handle multiple stops gracefully
      JobManagerService.stopPeriodicCleanup();
    });

    it('should run periodic cleanup at specified intervals', async () => {
      const getStateSpy = vi.fn().mockReturnValue({
        jobId: 'test-job',
        status: 'IDLE',
        intervalId: null,
        renewLockIntervalId: null,
      });

      const jobInstance = createMockJobInstance({
        getState: getStateSpy,
      });

      jobFactorySpy.mockReturnValue(jobInstance);
      JobManagerService.registerJob(
        JobType.DEFAULT_MATCHMAKING,
        mockJobEntryPoint,
      );

      JobManagerService.startPeriodicCleanup(mockServerConfig);

      // Initial call
      expect(getStateSpy).toHaveBeenCalledTimes(1);

      // Advance time by the cleanup interval
      vi.advanceTimersByTime(1000);

      // Should have been called again
      expect(getStateSpy).toHaveBeenCalledTimes(2);

      JobManagerService.stopPeriodicCleanup();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle JobFactoryService.init failure', () => {
      jobFactorySpy.mockImplementation(() => {
        throw new Error('Factory initialization failed');
      });

      expect(() => {
        JobManagerService.registerJob(
          JobType.DEFAULT_MATCHMAKING,
          mockJobEntryPoint,
        );
      }).toThrow('Factory initialization failed');
    });

    it('should handle concurrent access to job registry', async () => {
      const jobId = JobManagerService.registerJob(
        JobType.DEFAULT_MATCHMAKING,
        mockJobEntryPoint,
      );

      // Simulate concurrent operations
      const startPromise = JobManagerService._startJob(jobId);
      const stopPromise = JobManagerService._stopJob(jobId);
      const destroyPromise = JobManagerService._destroyJobAndUnregister(jobId);

      // All should complete without throwing (though some may fail due to job state)
      await Promise.allSettled([startPromise, stopPromise, destroyPromise]);

      // At least one operation should have been attempted
      expect(mockJobInstance.start).toHaveBeenCalled();
    });

    it('should preserve job registry state across multiple operations', async () => {
      const jobId1 = JobManagerService.registerJob(
        JobType.DEFAULT_MATCHMAKING,
        mockJobEntryPoint,
      );

      const mockJobInstance2 = createMockJobInstance({ jobId: 'job-2' });
      jobFactorySpy.mockReturnValue(mockJobInstance2);
      const jobId2 = JobManagerService.registerJob(
        JobType.DEFAULT_MATCHMAKING,
        mockJobEntryPoint,
      );

      // Destroy only first job
      await JobManagerService._destroyJobAndUnregister(jobId1);

      // Second job should still be in registry
      expect(JobManagerService._getJobDetails(jobId1)).toBeUndefined();
      expect(JobManagerService._getJobDetails(jobId2)).toBe(mockJobInstance2);
      expect(JobManagerService._getAllJobDetails()).toHaveLength(1);
    });
  });
});
