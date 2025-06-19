import { Queue, Worker } from 'bullmq';
import { QueueService } from '../QueueService.js';
import { WorkerService } from '../WorkerService.js';
import { SchedulerService } from '../SchedulerService.js';
import type { QueueConfig } from '../../model/QueueConfig.js';
import type { WorkerHandler } from '../../model/WorkerHandler.js';

// Mock dependencies
vi.mock('bullmq');
vi.mock('../WorkerService.js');
vi.mock('../SchedulerService.js');
vi.mock('../../config/ConnectionConfig.js', () => ({
  ConnectionConfig: {
    getBullMQConnection: vi.fn(() => ({ host: 'localhost', port: 6379 })),
  },
}));

describe('QueueService - Multi-Worker Creation Tests', () => {
  const mockQueue = {
    name: 'test-queue',
    close: vi.fn(),
    on: vi.fn(),
  } as unknown as Queue;

  const mockWorkers = [
    { id: 'worker-1', close: vi.fn() } as unknown as Worker,
    { id: 'worker-2', close: vi.fn() } as unknown as Worker,
    { id: 'worker-3', close: vi.fn() } as unknown as Worker,
    { id: 'worker-4', close: vi.fn() } as unknown as Worker,
  ];

  const mockHandlers: WorkerHandler[] = [
    { jobName: 'test:job1', handler: vi.fn() },
    { jobName: 'test:job2', handler: vi.fn() },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Queue constructor
    vi.mocked(Queue).mockImplementation(() => mockQueue);

    // Mock SchedulerService
    vi.mocked(SchedulerService.setup).mockResolvedValue(undefined);

    // Mock WorkerService to return different workers for each call
    let workerIndex = 0;
    vi.mocked(WorkerService.create).mockImplementation(() => {
      const worker = mockWorkers[workerIndex];
      workerIndex++;
      return worker;
    });
  });

  describe('Single Worker Configuration', () => {
    it('should create single worker when workerCount is not specified for job type', async () => {
      const config: QueueConfig = {
        type: 'job',
        queueName: 'test-queue',
        schedulers: [],
        // workerCount not specified - should default to 1
      };

      const result = await QueueService.init(config, mockHandlers);

      expect(result.queue).toBe(mockQueue);
      expect(result.workers).toHaveLength(1);
      expect(result.workers[0]).toBe(mockWorkers[0]);

      expect(WorkerService.create).toHaveBeenCalledTimes(1);
      expect(WorkerService.create).toHaveBeenCalledWith(
        'test-queue',
        mockHandlers,
        1, // worker number
      );
    });

    it('should create single worker when workerCount is 1', async () => {
      const config: QueueConfig = {
        type: 'job',
        queueName: 'test-queue',
        schedulers: [],
        workerCount: 1,
      };

      const result = await QueueService.init(config, mockHandlers);

      expect(result.queue).toBe(mockQueue);
      expect(result.workers).toHaveLength(1);
      expect(WorkerService.create).toHaveBeenCalledTimes(1);
    });

    it('should create single worker for non-job types regardless of workerCount', async () => {
      const config: QueueConfig = {
        type: 'cleanup',
        queueName: 'test-queue',
        schedulers: [],
      };

      const result = await QueueService.init(config, mockHandlers);

      expect(result.queue).toBe(mockQueue);
      expect(result.workers).toHaveLength(1);
      expect(WorkerService.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('Multi-Worker Configuration', () => {
    it('should create multiple workers when workerCount is specified', async () => {
      const config: QueueConfig = {
        type: 'job',
        queueName: 'test-queue',
        schedulers: [],
        workerCount: 4,
      };

      const result = await QueueService.init(config, mockHandlers);

      expect(result.queue).toBe(mockQueue);
      expect(result.workers).toHaveLength(4);
      expect(result.workers).toEqual(mockWorkers);

      expect(WorkerService.create).toHaveBeenCalledTimes(4);

      // Verify each worker is created with correct parameters
      for (let i = 0; i < 4; i++) {
        expect(WorkerService.create).toHaveBeenNthCalledWith(
          i + 1,
          'test-queue',
          mockHandlers,
          i + 1, // worker number starts from 1
        );
      }
    });

    it('should handle large worker counts', async () => {
      const largeWorkerCount = 10;
      const config: QueueConfig = {
        type: 'job',
        queueName: 'test-queue',
        schedulers: [],
        workerCount: largeWorkerCount,
      };

      // Create enough mock workers
      const largeMockWorkers = Array.from(
        { length: largeWorkerCount },
        (_, i) => ({
          id: `worker-${i + 1}`,
          close: vi.fn(),
        }),
      ) as unknown as Worker[];

      let workerIndex = 0;
      vi.mocked(WorkerService.create).mockImplementation(() => {
        const worker = largeMockWorkers[workerIndex];
        workerIndex++;
        return worker;
      });

      const result = await QueueService.init(config, mockHandlers);

      expect(result.workers).toHaveLength(largeWorkerCount);
      expect(WorkerService.create).toHaveBeenCalledTimes(largeWorkerCount);

      // Verify all workers are created with sequential numbers
      for (let i = 0; i < largeWorkerCount; i++) {
        expect(WorkerService.create).toHaveBeenNthCalledWith(
          i + 1,
          'test-queue',
          mockHandlers,
          i + 1,
        );
      }
    });

    it('should create workers with different queue names correctly', async () => {
      const config1: QueueConfig = {
        type: 'job',
        queueName: 'matchmaking',
        schedulers: [],
        workerCount: 2,
      };

      const config2: QueueConfig = {
        type: 'job',
        queueName: 'notifications',
        schedulers: [],
        workerCount: 3,
      };

      await QueueService.init(config1, mockHandlers);

      // Reset mock call count for second test
      vi.mocked(WorkerService.create).mockClear();
      let workerIndex = 0;
      vi.mocked(WorkerService.create).mockImplementation(() => {
        const worker = mockWorkers[workerIndex];
        workerIndex++;
        return worker;
      });

      await QueueService.init(config2, mockHandlers);

      // Check the second queue's worker creation
      expect(WorkerService.create).toHaveBeenCalledTimes(3);
      for (let i = 0; i < 3; i++) {
        expect(WorkerService.create).toHaveBeenNthCalledWith(
          i + 1,
          'notifications',
          mockHandlers,
          i + 1,
        );
      }
    });
  });

  describe('Scheduler Integration', () => {
    it('should setup schedulers before creating workers', async () => {
      const config: QueueConfig = {
        type: 'job',
        queueName: 'test-queue',
        schedulers: [
          {
            schedulerId: 'test-scheduler',
            repeatOptions: { every: 1000 },
            jobTemplate: { name: 'test:job', data: {} },
            handler: vi.fn(),
          },
        ],
        workerCount: 2,
      };

      await QueueService.init(config, mockHandlers);

      expect(SchedulerService.setup).toHaveBeenCalledWith(mockQueue, config);
      expect(SchedulerService.setup).toHaveBeenCalledBefore(
        vi.mocked(WorkerService.create),
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle Queue creation errors', async () => {
      const error = new Error('Queue creation failed');
      vi.mocked(Queue).mockImplementationOnce(() => {
        throw error;
      });

      const config: QueueConfig = {
        type: 'job',
        queueName: 'test-queue',
        schedulers: [],
        workerCount: 2,
      };

      await expect(QueueService.init(config, mockHandlers)).rejects.toThrow(
        'Queue creation failed',
      );

      // Workers should not be created if queue creation fails
      expect(WorkerService.create).not.toHaveBeenCalled();
    });

    it('should handle SchedulerService errors', async () => {
      const error = new Error('Scheduler setup failed');
      vi.mocked(SchedulerService.setup).mockRejectedValueOnce(error);

      const config: QueueConfig = {
        type: 'job',
        queueName: 'test-queue',
        schedulers: [
          {
            schedulerId: 'test-scheduler',
            repeatOptions: { every: 1000 },
            jobTemplate: { name: 'test:job', data: {} },
            handler: vi.fn(),
          },
        ],
        workerCount: 2,
      };

      await expect(QueueService.init(config, mockHandlers)).rejects.toThrow(
        'Scheduler setup failed',
      );

      // Workers should not be created if scheduler setup fails
      expect(WorkerService.create).not.toHaveBeenCalled();
    });

    it('should handle WorkerService creation errors', async () => {
      const error = new Error('Worker creation failed');
      vi.mocked(WorkerService.create)
        .mockReturnValueOnce(mockWorkers[0]) // First worker succeeds
        .mockImplementationOnce(() => {
          throw error; // Second worker fails
        });

      const config: QueueConfig = {
        type: 'job',
        queueName: 'test-queue',
        schedulers: [],
        workerCount: 2,
      };

      await expect(QueueService.init(config, mockHandlers)).rejects.toThrow(
        'Worker creation failed',
      );
    });

    it('should handle partial worker creation failures gracefully', async () => {
      const error = new Error('Worker creation failed');
      vi.mocked(WorkerService.create)
        .mockReturnValueOnce(mockWorkers[0]) // Worker 1 succeeds
        .mockReturnValueOnce(mockWorkers[1]) // Worker 2 succeeds
        .mockImplementationOnce(() => {
          throw error; // Worker 3 fails
        });

      const config: QueueConfig = {
        type: 'job',
        queueName: 'test-queue',
        schedulers: [],
        workerCount: 3,
      };

      await expect(QueueService.init(config, mockHandlers)).rejects.toThrow(
        'Worker creation failed',
      );

      // Verify first two workers were attempted
      expect(WorkerService.create).toHaveBeenCalledTimes(3);
    });
  });

  describe('Worker Numbering', () => {
    it('should assign sequential worker numbers starting from 1', async () => {
      const config: QueueConfig = {
        type: 'job',
        queueName: 'test-queue',
        schedulers: [],
        workerCount: 5,
      };

      // Create enough mock workers
      const workers = Array.from({ length: 5 }, (_, i) => ({
        id: `worker-${i + 1}`,
        close: vi.fn(),
      })) as unknown as Worker[];

      let workerIndex = 0;
      vi.mocked(WorkerService.create).mockImplementation(() => {
        const worker = workers[workerIndex];
        workerIndex++;
        return worker;
      });

      await QueueService.init(config, mockHandlers);

      // Verify worker numbers are 1, 2, 3, 4, 5
      for (let i = 0; i < 5; i++) {
        expect(WorkerService.create).toHaveBeenNthCalledWith(
          i + 1,
          'test-queue',
          mockHandlers,
          i + 1, // Worker number should be 1-based
        );
      }
    });

    it('should handle zero worker count correctly', async () => {
      const config: QueueConfig = {
        type: 'job',
        queueName: 'test-queue',
        schedulers: [],
        workerCount: 0,
      };

      const result = await QueueService.init(config, mockHandlers);

      expect(result.workers).toHaveLength(0);
      expect(WorkerService.create).not.toHaveBeenCalled();
    });
  });
});
