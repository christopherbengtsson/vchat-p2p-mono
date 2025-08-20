import { PipePoolService } from '../PipePoolService';
import { PERFORMANCE } from '../../model/constants/GameConstants';
import { noop } from '../../../../../common/utils/noop';

describe('PipePoolService', () => {
  beforeAll(() => {
    // Ensure the service is initialized once
    PipePoolService.initialize();
  });

  beforeEach(() => {
    // Reset the service state before each test
    // Note: Since the service uses module-level state, we need to reset it
    PipePoolService.reset();
  });

  describe('Pool initialization and size validation', () => {
    it('should initialize pool with correct size', () => {
      const stats = PipePoolService.getStats();
      expect(stats.total).toBe(PERFORMANCE.PIPE_POOL_SIZE);
      expect(stats.inactive).toBe(PERFORMANCE.PIPE_POOL_SIZE);
      expect(stats.active).toBe(0);
    });

    it('should initialize pipes with correct default properties', () => {
      const activePipes = PipePoolService.getActivePipes();
      expect(activePipes).toHaveLength(0);

      // All pipes should be inactive initially
      const stats = PipePoolService.getStats();
      expect(stats.inactive).toBe(PERFORMANCE.PIPE_POOL_SIZE);
    });

    it('should not reinitialize if already initialized', () => {
      // Acquire a pipe to change state
      const pipe = PipePoolService.acquire(100, 200, 50, 300, false);
      expect(pipe).not.toBeNull();

      const statsWithActivePipe = PipePoolService.getStats();
      expect(statsWithActivePipe.active).toBe(1);

      // Try to initialize again - should not affect existing state
      PipePoolService.initialize();
      const afterSecondInit = PipePoolService.getStats();

      // State should remain the same (1 active pipe)
      expect(afterSecondInit.active).toBe(1);
      expect(afterSecondInit.inactive).toBe(PERFORMANCE.PIPE_POOL_SIZE - 1);
    });
  });

  describe('Acquire/release cycle functionality', () => {
    it('should acquire pipe with correct properties', () => {
      const x = 100;
      const y = 200;
      const width = 50;
      const height = 300;
      const isUpperPipe = true;

      const pipe = PipePoolService.acquire(x, y, width, height, isUpperPipe);

      expect(pipe).not.toBeNull();
      expect(pipe!.x).toBe(x);
      expect(pipe!.y).toBe(y);
      expect(pipe!.width).toBe(width);
      expect(pipe!.height).toBe(height);
      expect(pipe!.isUpperPipe).toBe(isUpperPipe);
      expect(pipe!.passed).toBe(false);
      expect(pipe!.active).toBe(true);
    });

    it('should update pool statistics when acquiring pipes', () => {
      const initialStats = PipePoolService.getStats();
      expect(initialStats.active).toBe(0);

      PipePoolService.acquire(100, 200, 50, 300, false);
      const afterAcquire = PipePoolService.getStats();

      expect(afterAcquire.active).toBe(1);
      expect(afterAcquire.inactive).toBe(initialStats.total - 1);
    });

    it('should release pipe and return it to inactive state', () => {
      const pipe = PipePoolService.acquire(100, 200, 50, 300, false);
      expect(pipe).not.toBeNull();
      expect(pipe!.active).toBe(true);

      PipePoolService.release(pipe!);

      expect(pipe!.active).toBe(false);
      expect(pipe!.x).toBe(-1000); // Should be reset to indicate unused

      const stats = PipePoolService.getStats();
      expect(stats.active).toBe(0);
      expect(stats.inactive).toBe(PERFORMANCE.PIPE_POOL_SIZE);
    });

    it('should allow reusing released pipes', () => {
      // Acquire and release a pipe
      const firstPipe = PipePoolService.acquire(100, 200, 50, 300, false);
      PipePoolService.release(firstPipe!);

      // Acquire another pipe - should reuse the released one
      const secondPipe = PipePoolService.acquire(400, 500, 75, 400, true);

      expect(secondPipe).toBe(firstPipe); // Should be the same object
      expect(secondPipe!.x).toBe(400);
      expect(secondPipe!.y).toBe(500);
      expect(secondPipe!.width).toBe(75);
      expect(secondPipe!.height).toBe(400);
      expect(secondPipe!.isUpperPipe).toBe(true);
      expect(secondPipe!.active).toBe(true);
    });

    it('should track active pipes correctly', () => {
      const pipe1 = PipePoolService.acquire(100, 200, 50, 300, false);
      const pipe2 = PipePoolService.acquire(200, 300, 60, 350, true);

      const activePipes = PipePoolService.getActivePipes();
      expect(activePipes).toHaveLength(2);
      expect(activePipes).toContain(pipe1);
      expect(activePipes).toContain(pipe2);

      PipePoolService.release(pipe1!);
      const activePipesAfterRelease = PipePoolService.getActivePipes();
      expect(activePipesAfterRelease).toHaveLength(1);
      expect(activePipesAfterRelease).toContain(pipe2);
      expect(activePipesAfterRelease).not.toContain(pipe1);
    });
  });

  describe('Pool exhaustion handling', () => {
    it('should handle pool exhaustion gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(noop);

      // Acquire all pipes in the pool
      const pipes = [];
      for (let i = 0; i < PERFORMANCE.PIPE_POOL_SIZE; i++) {
        const pipe = PipePoolService.acquire(i * 10, i * 20, 50, 300, false);
        pipes.push(pipe);
      }

      // Pool should be exhausted
      const statsBeforeExhaustion = PipePoolService.getStats();
      expect(statsBeforeExhaustion.active).toBe(PERFORMANCE.PIPE_POOL_SIZE);
      expect(statsBeforeExhaustion.inactive).toBe(0);

      // Try to acquire one more pipe - should create a new one
      const exhaustedPipe = PipePoolService.acquire(1000, 2000, 50, 300, true);

      expect(exhaustedPipe).not.toBeNull();
      expect(exhaustedPipe!.x).toBe(1000);
      expect(exhaustedPipe!.y).toBe(2000);
      expect(exhaustedPipe!.active).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Pipe pool exhausted, creating new pipe',
      );

      // The new pipe should not be tracked in the pool statistics
      const statsAfterExhaustion = PipePoolService.getStats();
      expect(statsAfterExhaustion.active).toBe(PERFORMANCE.PIPE_POOL_SIZE);
      expect(statsAfterExhaustion.inactive).toBe(0);

      consoleSpy.mockRestore();
    });

    it('should return new pipe object when pool is exhausted', () => {
      // Acquire all pipes
      for (let i = 0; i < PERFORMANCE.PIPE_POOL_SIZE; i++) {
        PipePoolService.acquire(i, i, 50, 300, false);
      }

      // Get one more pipe when exhausted
      const exhaustedPipe = PipePoolService.acquire(999, 888, 75, 400, true);

      expect(exhaustedPipe).not.toBeNull();
      expect(exhaustedPipe!.x).toBe(999);
      expect(exhaustedPipe!.y).toBe(888);
      expect(exhaustedPipe!.width).toBe(75);
      expect(exhaustedPipe!.height).toBe(400);
      expect(exhaustedPipe!.isUpperPipe).toBe(true);
      expect(exhaustedPipe!.passed).toBe(false);
      expect(exhaustedPipe!.active).toBe(true);
    });
  });

  describe('Reset functionality', () => {
    it('should reset all pipes to inactive state', () => {
      // Acquire several pipes
      const pipe1 = PipePoolService.acquire(100, 200, 50, 300, false);
      const pipe2 = PipePoolService.acquire(200, 300, 60, 350, true);

      // Mark one as passed
      pipe1!.passed = true;

      const statsBeforeReset = PipePoolService.getStats();
      expect(statsBeforeReset.active).toBe(2);

      // Reset the pool
      PipePoolService.reset();

      const statsAfterReset = PipePoolService.getStats();
      expect(statsAfterReset.active).toBe(0);
      expect(statsAfterReset.inactive).toBe(PERFORMANCE.PIPE_POOL_SIZE);

      // Check that pipes are properly reset
      expect(pipe1!.active).toBe(false);
      expect(pipe1!.x).toBe(-1000);
      expect(pipe1!.passed).toBe(false);

      expect(pipe2!.active).toBe(false);
      expect(pipe2!.x).toBe(-1000);
      expect(pipe2!.passed).toBe(false);
    });

    it('should allow acquiring pipes after reset', () => {
      // Acquire and reset
      PipePoolService.acquire(100, 200, 50, 300, false);
      PipePoolService.reset();

      // Should be able to acquire again
      const newPipe = PipePoolService.acquire(400, 500, 75, 400, true);

      expect(newPipe).not.toBeNull();
      expect(newPipe!.active).toBe(true);
      expect(newPipe!.x).toBe(400);
      expect(newPipe!.y).toBe(500);

      const stats = PipePoolService.getStats();
      expect(stats.active).toBe(1);
      expect(stats.inactive).toBe(PERFORMANCE.PIPE_POOL_SIZE - 1);
    });

    it('should reset passed state for all pipes', () => {
      // Acquire pipes and mark them as passed
      const pipe1 = PipePoolService.acquire(100, 200, 50, 300, false);
      const pipe2 = PipePoolService.acquire(200, 300, 60, 350, true);

      pipe1!.passed = true;
      pipe2!.passed = true;

      PipePoolService.reset();

      expect(pipe1!.passed).toBe(false);
      expect(pipe2!.passed).toBe(false);
    });
  });

  describe('getStats functionality', () => {
    it('should return correct statistics for empty pool', () => {
      const stats = PipePoolService.getStats();

      expect(stats.active).toBe(0);
      expect(stats.inactive).toBe(PERFORMANCE.PIPE_POOL_SIZE);
      expect(stats.total).toBe(PERFORMANCE.PIPE_POOL_SIZE);
    });

    it('should return correct statistics with mixed active/inactive pipes', () => {
      const activeCount = 5;

      // Acquire some pipes
      for (let i = 0; i < activeCount; i++) {
        PipePoolService.acquire(i * 10, i * 20, 50, 300, false);
      }

      const stats = PipePoolService.getStats();

      expect(stats.active).toBe(activeCount);
      expect(stats.inactive).toBe(PERFORMANCE.PIPE_POOL_SIZE - activeCount);
      expect(stats.total).toBe(PERFORMANCE.PIPE_POOL_SIZE);
    });

    it('should return correct statistics when pool is full', () => {
      // Acquire all pipes
      for (let i = 0; i < PERFORMANCE.PIPE_POOL_SIZE; i++) {
        PipePoolService.acquire(i, i, 50, 300, false);
      }

      const stats = PipePoolService.getStats();

      expect(stats.active).toBe(PERFORMANCE.PIPE_POOL_SIZE);
      expect(stats.inactive).toBe(0);
      expect(stats.total).toBe(PERFORMANCE.PIPE_POOL_SIZE);
    });
  });
});
