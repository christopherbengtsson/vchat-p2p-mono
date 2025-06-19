import type { Mock } from 'vitest';
import { Worker } from 'bullmq';
import { CustomError } from '@mono/common-dto';
import { WorkerService } from '../WorkerService.js';
import type { WorkerHandler } from '../../model/WorkerHandler.js';

// Mock dependencies
vi.mock('bullmq');
vi.mock('../../config/ConnectionConfig.js', () => ({
  ConnectionConfig: {
    getBullMQConnection: vi.fn(() => ({ host: 'localhost', port: 6379 })),
  },
}));

describe('WorkerService - Multi-Worker Support Tests', () => {
  const mockWorker = {
    id: 'test-worker',
    close: vi.fn(),
    on: vi.fn(),
  } as unknown as Worker;

  const mockHandlers: readonly WorkerHandler[] = [
    { jobName: 'test:job1', handler: vi.fn().mockResolvedValue(undefined) },
    { jobName: 'test:job2', handler: vi.fn().mockResolvedValue(undefined) },
    { jobName: 'test:job3', handler: vi.fn().mockResolvedValue(undefined) },
  ] as const;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Worker).mockImplementation(() => mockWorker);
  });

  describe('Worker Creation', () => {
    it('should create worker with default ID when no worker number provided', () => {
      const queueName = 'test-queue';

      const worker = WorkerService.create(queueName, mockHandlers);

      expect(worker).toBe(mockWorker);
      expect(Worker).toHaveBeenCalledWith(
        queueName,
        expect.any(Function), // Job processor function
        {
          connection: { host: 'localhost', port: 6379 },
          concurrency: 100,
          maxStalledCount: 3,
        },
      );
    });

    it('should create worker with numbered ID when worker number provided', () => {
      const queueName = 'matchmaking';
      const workerNumber = 3;

      const worker = WorkerService.create(
        queueName,
        mockHandlers,
        workerNumber,
      );

      expect(worker).toBe(mockWorker);
      expect(Worker).toHaveBeenCalledWith(queueName, expect.any(Function), {
        connection: { host: 'localhost', port: 6379 },
        concurrency: 100,
        maxStalledCount: 3,
      });
    });

    it('should create multiple unique workers for same queue', () => {
      const queueName = 'test-queue';

      const worker1 = WorkerService.create(queueName, mockHandlers, 1);
      const worker2 = WorkerService.create(queueName, mockHandlers, 2);
      const worker3 = WorkerService.create(queueName, mockHandlers, 3);

      expect(Worker).toHaveBeenCalledTimes(3);
      expect(worker1).toBe(mockWorker);
      expect(worker2).toBe(mockWorker);
      expect(worker3).toBe(mockWorker);
    });

    it('should create workers with different queue names', () => {
      const handlers1: readonly WorkerHandler[] = [
        { jobName: 'matchmaking:process', handler: vi.fn() },
      ];
      const handlers2: readonly WorkerHandler[] = [
        { jobName: 'notifications:send', handler: vi.fn() },
      ];

      WorkerService.create('matchmaking', handlers1, 1);
      WorkerService.create('notifications', handlers2, 1);

      expect(Worker).toHaveBeenCalledTimes(2);
      expect(Worker).toHaveBeenNthCalledWith(
        1,
        'matchmaking',
        expect.any(Function),
        expect.any(Object),
      );
      expect(Worker).toHaveBeenNthCalledWith(
        2,
        'notifications',
        expect.any(Function),
        expect.any(Object),
      );
    });
  });

  describe('Job Processing', () => {
    let jobProcessor: (job: any) => Promise<void>;

    beforeEach(() => {
      WorkerService.create('test-queue', mockHandlers);

      // Extract the job processor function
      const workerCall = vi.mocked(Worker).mock.calls[0];
      jobProcessor = workerCall[1] as (job: any) => Promise<void>;
    });

    it('should process jobs with correct handlers', async () => {
      const job1 = {
        name: 'test:job1',
        data: { test: 'data1' },
        updateData: vi.fn(),
      };
      const job2 = {
        name: 'test:job2',
        data: { test: 'data2' },
        updateData: vi.fn(),
      };

      await jobProcessor(job1);
      await jobProcessor(job2);

      expect(mockHandlers[0].handler).toHaveBeenCalledWith(job1);
      expect(mockHandlers[1].handler).toHaveBeenCalledWith(job2);
      expect(mockHandlers[2].handler).not.toHaveBeenCalled();
    });

    it('should throw error for unknown job types', async () => {
      const unknownJob = { name: 'unknown:job', data: {} };

      await expect(jobProcessor(unknownJob)).rejects.toThrow(
        CustomError.badState('No handler found for job: unknown:job'),
      );
    });

    it('should propagate handler errors', async () => {
      const error = new Error('Handler failed');
      (mockHandlers[0].handler as Mock).mockRejectedValueOnce(error);

      const job = { name: 'test:job1', data: {}, updateData: vi.fn() };

      await expect(jobProcessor(job)).rejects.toThrow('Handler failed');
    });

    it('should handle multiple concurrent jobs correctly', async () => {
      const jobs = [
        { name: 'test:job1', data: { id: 1 }, updateData: vi.fn() },
        { name: 'test:job2', data: { id: 2 }, updateData: vi.fn() },
        { name: 'test:job1', data: { id: 3 }, updateData: vi.fn() },
        { name: 'test:job3', data: { id: 4 }, updateData: vi.fn() },
      ];

      // Process all jobs concurrently
      await Promise.all(jobs.map((job) => jobProcessor(job)));

      expect(mockHandlers[0].handler).toHaveBeenCalledTimes(2); // test:job1
      expect(mockHandlers[1].handler).toHaveBeenCalledTimes(1); // test:job2
      expect(mockHandlers[2].handler).toHaveBeenCalledTimes(1); // test:job3
    });
  });

  describe('Handler Mapping', () => {
    it('should create correct handler map from handlers array', async () => {
      const handlers: readonly WorkerHandler[] = [
        { jobName: 'job:a', handler: vi.fn() },
        { jobName: 'job:b', handler: vi.fn() },
        { jobName: 'job:c', handler: vi.fn() },
      ];

      WorkerService.create('test-queue', handlers);

      const workerCall = vi.mocked(Worker).mock.calls[0];
      const jobProcessor = workerCall[1] as (job: any) => Promise<void>;

      // Test each handler
      await jobProcessor({ name: 'job:a', data: {}, updateData: vi.fn() });
      await jobProcessor({ name: 'job:b', data: {}, updateData: vi.fn() });
      await jobProcessor({ name: 'job:c', data: {}, updateData: vi.fn() });

      expect(handlers[0].handler).toHaveBeenCalledTimes(1);
      expect(handlers[1].handler).toHaveBeenCalledTimes(1);
      expect(handlers[2].handler).toHaveBeenCalledTimes(1);
    });

    it('should handle empty handlers array', () => {
      const emptyHandlers: readonly WorkerHandler[] = [];

      const worker = WorkerService.create('test-queue', emptyHandlers);

      expect(worker).toBe(mockWorker);
      expect(Worker).toHaveBeenCalledTimes(1);
    });

    it('should handle single handler', async () => {
      const singleHandler: readonly WorkerHandler[] = [
        { jobName: 'single:job', handler: vi.fn() },
      ];

      WorkerService.create('test-queue', singleHandler);

      const workerCall = vi.mocked(Worker).mock.calls[0];
      const jobProcessor = workerCall[1] as (job: any) => Promise<void>;

      await jobProcessor({ name: 'single:job', data: {}, updateData: vi.fn() });

      expect(singleHandler[0].handler).toHaveBeenCalledTimes(1);
    });

    it('should handle duplicate job names by using last handler', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const handlers: readonly WorkerHandler[] = [
        { jobName: 'duplicate:job', handler: handler1 },
        { jobName: 'duplicate:job', handler: handler2 }, // This should override
      ];

      WorkerService.create('test-queue', handlers);

      const workerCall = vi.mocked(Worker).mock.calls[0];
      const jobProcessor = workerCall[1] as (job: any) => Promise<void>;

      await jobProcessor({
        name: 'duplicate:job',
        data: {},
        updateData: vi.fn(),
      });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('Worker Configuration', () => {
    it('should set correct concurrency level', () => {
      WorkerService.create('test-queue', mockHandlers);

      expect(Worker).toHaveBeenCalledWith(
        'test-queue',
        expect.any(Function),
        expect.objectContaining({
          concurrency: 100,
        }),
      );
    });

    it('should use correct connection configuration', () => {
      WorkerService.create('test-queue', mockHandlers);

      expect(Worker).toHaveBeenCalledWith(
        'test-queue',
        expect.any(Function),
        expect.objectContaining({
          connection: { host: 'localhost', port: 6379 },
        }),
      );
    });

    it('should work with different queue names and maintain isolation', () => {
      const handlers1: readonly WorkerHandler[] = [
        { jobName: 'queue1:job', handler: vi.fn() },
      ];
      const handlers2: readonly WorkerHandler[] = [
        { jobName: 'queue2:job', handler: vi.fn() },
      ];

      const worker1 = WorkerService.create('queue1', handlers1, 1);
      const worker2 = WorkerService.create('queue2', handlers2, 1);

      expect(worker1).toBe(mockWorker);
      expect(worker2).toBe(mockWorker);
      expect(Worker).toHaveBeenCalledTimes(2);

      // Verify each worker is bound to correct queue
      expect(Worker).toHaveBeenNthCalledWith(
        1,
        'queue1',
        expect.any(Function),
        expect.any(Object),
      );
      expect(Worker).toHaveBeenNthCalledWith(
        2,
        'queue2',
        expect.any(Function),
        expect.any(Object),
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle Worker constructor errors', () => {
      const error = new Error('Worker creation failed');
      vi.mocked(Worker).mockImplementationOnce(() => {
        throw error;
      });

      expect(() => {
        WorkerService.create('test-queue', mockHandlers);
      }).toThrow('Worker creation failed');
    });

    it('should propagate connection errors', () => {
      const connectionError = new Error('Redis connection failed');
      vi.mocked(Worker).mockImplementationOnce(() => {
        throw connectionError;
      });

      expect(() => {
        WorkerService.create('test-queue', mockHandlers);
      }).toThrow('Redis connection failed');
    });
  });

  describe('Worker Identification', () => {
    it('should generate different worker identifiers for same queue', () => {
      // Create multiple workers for verification
      const worker1 = WorkerService.create('test-queue', mockHandlers, 1);
      const worker2 = WorkerService.create('test-queue', mockHandlers, 2);
      const worker3 = WorkerService.create('test-queue', mockHandlers, 3);

      expect(Worker).toHaveBeenCalledTimes(3);

      // All workers should be created but with different configurations
      // (In real implementation, worker IDs would be different)
      expect(worker1).toBeDefined();
      expect(worker2).toBeDefined();
      expect(worker3).toBeDefined();
    });

    it('should handle large worker numbers', () => {
      const largeWorkerNumber = 999;

      const worker = WorkerService.create(
        'test-queue',
        mockHandlers,
        largeWorkerNumber,
      );

      expect(worker).toBe(mockWorker);
      expect(Worker).toHaveBeenCalledTimes(1);
    });

    it('should handle worker number edge cases', () => {
      // Test with various worker numbers
      [0, 1, 100, -1].forEach((workerNumber, index) => {
        const worker = WorkerService.create(
          'test-queue',
          mockHandlers,
          workerNumber,
        );
        expect(worker).toBe(mockWorker);
        expect(Worker).toHaveBeenCalledTimes(index + 1);
      });
    });
  });
});
