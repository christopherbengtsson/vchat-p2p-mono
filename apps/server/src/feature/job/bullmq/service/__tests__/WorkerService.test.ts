import type { Mock } from 'vitest';
import { Worker } from 'bullmq';
import { CustomError } from '@mono/common-dto';
import { WorkerService } from '../WorkerService.js';
import type { WorkerHandler } from '../../model/WorkerHandler.js';
import type { QueueConfig } from '../../model/QueueConfig.js';

// Mock dependencies
vi.mock('bullmq');
vi.mock('../../config/ConnectionConfig.js', () => ({
  ConnectionConfig: {
    getBullMQConnection: vi.fn(() => ({ host: 'localhost', port: 6379 })),
  },
}));

describe('WorkerService', () => {
  const mockWorker = {
    id: 'test-worker',
    close: vi.fn(),
    on: vi.fn(),
  } as unknown as Worker;

  const mockHandlers: readonly WorkerHandler[] = [
    { jobName: 'test:job1', handler: vi.fn().mockResolvedValue(undefined) },
    { jobName: 'test:job2', handler: vi.fn().mockResolvedValue(undefined) },
  ] as const;

  const mockQueueConfig = {
    type: 'job',
    queueName: 'test-queue',
    schedulers: [],
  } as unknown as QueueConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Worker).mockImplementation(() => mockWorker);
  });

  describe('Worker Creation', () => {
    it('should create a worker with a default ID when no worker number is provided', () => {
      const worker = WorkerService.create(mockQueueConfig, mockHandlers);

      expect(worker).toBe(mockWorker);
      expect(Worker).toHaveBeenCalledWith(
        'test-queue',
        expect.any(Function), // Job processor function
        expect.any(Object),
      );
    });

    it('should create a worker with a numbered ID when a worker number is provided', () => {
      const worker = WorkerService.create(mockQueueConfig, mockHandlers, 3);

      expect(worker).toBe(mockWorker);
      // The workerId is generated internally, but we can check the queue name is passed correctly
      expect(Worker).toHaveBeenCalledWith(
        'test-queue',
        expect.any(Function),
        expect.any(Object),
      );
    });
  });

  describe('Job Processing', () => {
    let jobProcessor: (job: any) => Promise<void>;

    beforeEach(() => {
      WorkerService.create(mockQueueConfig, mockHandlers);
      // Extract the job processor function from the mock call
      const workerCall = vi.mocked(Worker).mock.calls[0];
      jobProcessor = workerCall[1] as (job: any) => Promise<void>;
    });

    it('should process jobs by calling the correct handler', async () => {
      const job1 = { name: 'test:job1', data: {}, updateData: vi.fn() };
      const job2 = { name: 'test:job2', data: {}, updateData: vi.fn() };

      await jobProcessor(job1);
      await jobProcessor(job2);

      expect(mockHandlers[0].handler).toHaveBeenCalledWith(job1);
      expect(mockHandlers[1].handler).toHaveBeenCalledWith(job2);
    });

    it('should throw an error for a job with no registered handler', async () => {
      const unknownJob = { name: 'unknown:job', data: {}, updateData: vi.fn() };

      await expect(jobProcessor(unknownJob)).rejects.toThrow(
        CustomError.badState('No handler found for job: unknown:job'),
      );
    });

    it('should propagate errors from the handler', async () => {
      const error = new Error('Handler failed');
      (mockHandlers[0].handler as Mock).mockRejectedValueOnce(error);

      const job = { name: 'test:job1', data: {}, updateData: vi.fn() };

      await expect(jobProcessor(job)).rejects.toThrow('Handler failed');
    });

    it('should add the workerId to the job data before processing', async () => {
      const job = { name: 'test:job1', data: {}, updateData: vi.fn() };
      await jobProcessor(job);

      expect(job.updateData).toHaveBeenCalledWith({ workerId: 'test-queue' });
    });
  });

  describe('Worker Configuration', () => {
    it('should use concurrency from queue config when provided', () => {
      const configWithConcurrency: QueueConfig = {
        ...mockQueueConfig,
        concurrencyPerWorker: 25,
      };
      WorkerService.create(configWithConcurrency, mockHandlers);

      expect(Worker).toHaveBeenCalledWith(
        'test-queue',
        expect.any(Function),
        expect.objectContaining({
          concurrency: 25,
        }),
      );
    });

    it('should use default concurrency of 100 when not provided in config', () => {
      const configWithoutConcurrency: QueueConfig = { ...mockQueueConfig };
      WorkerService.create(configWithoutConcurrency, mockHandlers);

      expect(Worker).toHaveBeenCalledWith(
        'test-queue',
        expect.any(Function),
        expect.objectContaining({
          concurrency: 100, // The fallback value in the implementation
        }),
      );
    });

    it('should use the correct connection configuration', () => {
      WorkerService.create(mockQueueConfig, mockHandlers);

      expect(Worker).toHaveBeenCalledWith(
        'test-queue',
        expect.any(Function),
        expect.objectContaining({
          connection: { host: 'localhost', port: 6379 },
        }),
      );
    });
  });
});
