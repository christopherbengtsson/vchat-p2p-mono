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

describe('QueueService', () => {
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

    vi.mocked(Queue).mockImplementation(() => mockQueue);
    vi.mocked(SchedulerService.setup).mockResolvedValue(undefined);

    let workerIndex = 0;
    vi.mocked(WorkerService.create).mockImplementation(() => {
      const worker = mockWorkers[workerIndex];
      workerIndex++;
      return worker;
    });
  });

  describe('Single Worker Configuration', () => {
    it('should create a single worker when workerCount is not specified for a job type', async () => {
      const config: QueueConfig = {
        type: 'job',
        queueName: 'test-queue',
        concurrencyPerWorker: 1,
        schedulers: [],
      };

      const result = await QueueService.init(config, mockHandlers);

      expect(result.queue).toBe(mockQueue);
      expect(result.workers).toHaveLength(1);
      expect(result.workers[0]).toBe(mockWorkers[0]);

      expect(WorkerService.create).toHaveBeenCalledTimes(1);
      expect(WorkerService.create).toHaveBeenCalledWith(
        config,
        mockHandlers,
        1,
      );
    });

    it('should create a single worker when workerCount is 1', async () => {
      const config: QueueConfig = {
        type: 'job',
        queueName: 'test-queue',
        schedulers: [],
        workerCount: 1,
        concurrencyPerWorker: 1,
      };

      const result = await QueueService.init(config, mockHandlers);

      expect(result.queue).toBe(mockQueue);
      expect(result.workers).toHaveLength(1);
      expect(WorkerService.create).toHaveBeenCalledTimes(1);
    });

    it('should create a single worker for non-job types, regardless of workerCount', async () => {
      const config: QueueConfig = {
        type: 'cleanup',
        queueName: 'test-queue',
        schedulers: [],
        concurrencyPerWorker: 1,
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
        concurrencyPerWorker: 1,
      };

      const result = await QueueService.init(config, mockHandlers);

      expect(result.queue).toBe(mockQueue);
      expect(result.workers).toHaveLength(4);
      expect(result.workers).toEqual(mockWorkers);

      expect(WorkerService.create).toHaveBeenCalledTimes(4);

      for (let i = 0; i < 4; i++) {
        expect(WorkerService.create).toHaveBeenNthCalledWith(
          i + 1,
          config,
          mockHandlers,
          i + 1,
        );
      }
    });

    it('should handle large worker counts correctly', async () => {
      const largeWorkerCount = 10;
      const config: QueueConfig = {
        type: 'job',
        queueName: 'test-queue',
        schedulers: [],
        workerCount: largeWorkerCount,
        concurrencyPerWorker: 1,
      };

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

      for (let i = 0; i < largeWorkerCount; i++) {
        expect(WorkerService.create).toHaveBeenNthCalledWith(
          i + 1,
          config,
          mockHandlers,
          i + 1,
        );
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle errors during Queue creation', async () => {
      const error = new Error('Queue creation failed');
      vi.mocked(Queue).mockImplementationOnce(() => {
        throw error;
      });

      const config: QueueConfig = {
        type: 'job',
        queueName: 'test-queue',
        schedulers: [],
        workerCount: 2,
        concurrencyPerWorker: 1,
      };

      await expect(QueueService.init(config, mockHandlers)).rejects.toThrow(
        'Queue creation failed',
      );
      expect(WorkerService.create).not.toHaveBeenCalled();
    });

    it('should handle errors from SchedulerService', async () => {
      const error = new Error('Scheduler setup failed');
      vi.mocked(SchedulerService.setup).mockRejectedValueOnce(error);

      const config: QueueConfig = {
        type: 'job',
        queueName: 'test-queue',
        concurrencyPerWorker: 1,
        schedulers: [
          {
            schedulerId: 's1',
            repeatOptions: {},
            jobTemplate: {},
            handler: vi.fn(),
          },
        ],
        workerCount: 2,
      };

      await expect(QueueService.init(config, mockHandlers)).rejects.toThrow(
        'Scheduler setup failed',
      );
      expect(WorkerService.create).not.toHaveBeenCalled();
    });

    it('should handle errors during WorkerService creation', async () => {
      const error = new Error('Worker creation failed');
      vi.mocked(WorkerService.create).mockImplementationOnce(() => {
        throw error;
      });

      const config: QueueConfig = {
        type: 'job',
        queueName: 'test-queue',
        schedulers: [],
        workerCount: 1,
        concurrencyPerWorker: 1,
      };

      await expect(QueueService.init(config, mockHandlers)).rejects.toThrow(
        'Worker creation failed',
      );
    });
  });
});
