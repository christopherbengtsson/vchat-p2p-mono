import type { Server } from 'socket.io';
import type { Mock } from 'vitest';
import { noop } from '@mono/common-util';
import { MatchmakingProcessor } from '../MatchmakingProcessor.js';
import { WaitingQueueService } from '../WaitingQueueService.js';
import { IgnoredUsersService } from '../IgnoredUsersService.js';
import { logger } from '../../utils/logger.js';
import { redisClient } from '../../clients/redis.js';

vi.mock('../../clients/redis.js', () => ({
  redisClient: {
    set: vi.fn().mockResolvedValue('OK'),
    eval: vi.fn().mockResolvedValue(1),
    pipeline: vi.fn(() => ({
      zscore: vi.fn().mockReturnThis(),
      hexists: vi.fn().mockReturnThis(),
      zrem: vi.fn().mockReturnThis(),
      hset: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([
        [null, '1234567890'], // user1Score
        [null, 0], // user1HasMatch
        [null, '1234567890'], // user2Score
        [null, 0], // user2HasMatch
      ]),
    })),
    pexpire: vi.fn().mockResolvedValue(1), // For lock watchdog
    del: vi.fn().mockResolvedValue(1), // For cleanupOrphanedLocks
    exists: vi.fn().mockResolvedValue(0), // For cleanupOrphanedLocks
    pttl: vi.fn().mockResolvedValue(1000), // For cleanupOrphanedLocks
  },
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  },
}));

describe('MatchmakingProcessor', () => {
  // Common test objects
  let mockIo: Server;
  let mockRedis: any;
  let mockWaitingQueueService: Partial<WaitingQueueService>;
  let processor: MatchmakingProcessor;

  let getIgnoredPairsForUsersSpy: Mock;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.spyOn(global, 'setInterval');
    vi.spyOn(global, 'clearInterval');

    // Mock Redis client
    mockRedis = vi.mocked(redisClient);

    // Mock Socket.IO server
    mockIo = {
      of: vi.fn().mockReturnThis(),
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    } as unknown as Server;

    // Mock WaitingQueueService
    mockWaitingQueueService = {
      queueKey: 'waiting_queue',
      delimiter: '__:__',
      matchAssignmentsKey: 'match_assignments',
      getMultipleFromQueue: vi.fn().mockResolvedValue([]),
      getQueueCount: vi.fn().mockResolvedValue(0),
      splitRedisKey: vi
        .fn()
        .mockReturnValue({ socketId: 'test', userId: 'test' }),
      composeKey: vi
        .fn()
        .mockImplementation(({ socketId, userId }) => `${socketId}:${userId}`),
      lastUserJoinedAt: 0, // For testing recent join prioritization
    } as Partial<WaitingQueueService>; // Cast to Partial to allow setting read-only

    // Initialize processor with mocks
    processor = new MatchmakingProcessor(
      mockWaitingQueueService as WaitingQueueService,
      mockIo,
      {
        interval: 100,
        batchSize: 10,
        lockDuration: 1000,
        segmentCount: 4,
      },
    );

    getIgnoredPairsForUsersSpy = vi.fn();

    vi.spyOn(global, 'setInterval').mockImplementation(() => {
      return 123 as unknown as NodeJS.Timeout;
    });
    vi.spyOn(global, 'clearInterval').mockImplementation(noop);

    vi.spyOn(IgnoredUsersService, 'getIgnoredPairsForUsers').mockImplementation(
      getIgnoredPairsForUsersSpy,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('I. Initialization & Configuration', () => {
    it('should initialize with default options when options are not provided', () => {
      const defaultProcessor = new MatchmakingProcessor(
        mockWaitingQueueService as WaitingQueueService,
        mockIo,
        mockRedis,
      );

      expect(defaultProcessor['options'].interval).toBe(1000);
      expect(defaultProcessor['options'].batchSize).toBe(100);
      expect(defaultProcessor['options'].lockDuration).toBe(5000);
      expect(defaultProcessor['options'].segmentCount).toBe(8);
      expect(defaultProcessor['options'].bucketSizeLimits).toEqual({
        critical: 200,
        high: 300,
        medium: 400,
        normal: 500,
      });
      expect(defaultProcessor['options'].maxLookAhead).toBe(50);
      expect(defaultProcessor['options'].cleanupInterval).toBe(60_000);
      expect(defaultProcessor['options'].hscanCountForCleanup).toBe(50);
    });

    it('should initialize with provided options', () => {
      expect(processor['options'].interval).toBe(100);
      expect(processor['options'].batchSize).toBe(10);
      expect(processor['options'].lockDuration).toBe(1000);
      expect(processor['options'].segmentCount).toBe(4);
      expect(processor['options'].bucketSizeLimits).toEqual({
        critical: 200,
        high: 300,
        medium: 400,
        normal: 500,
      });
      expect(processor['options'].maxLookAhead).toBe(50);
      expect(processor['options'].cleanupInterval).toBe(60_000);
      expect(processor['options'].hscanCountForCleanup).toBe(50); // Added this line (takes default)
    });
  });

  describe('II. Lifecycle Management (Start/Stop/Intervals)', () => {
    it('should set up processing and cleanup intervals when started', () => {
      const cleanupSpy = vi
        .spyOn(processor as any, 'startPeriodicCleanup')
        .mockImplementation(() => {
          processor['cleanupInterval'] = 123 as unknown as NodeJS.Timeout;
        });

      processor.start();

      expect(cleanupSpy).toHaveBeenCalled();
      expect(processor['processingInterval']).toBeTruthy();
      // setInterval for processMatches is called directly
      expect(global.setInterval).toHaveBeenCalledWith(
        expect.any(Function),
        processor['options'].interval,
      );
    });

    it('should not start if already running', () => {
      processor.start();
      const initialSetIntervalCalls = vi.mocked(global.setInterval).mock.calls
        .length;
      processor.start(); // Second call
      expect(global.setInterval).toHaveBeenCalledTimes(initialSetIntervalCalls);
    });

    it('should clear both intervals when stopped', () => {
      // Set up intervals as if processor was started
      processor['processingInterval'] = setInterval(
        noop,
        1000,
      ) as NodeJS.Timeout;
      processor['cleanupInterval'] = setInterval(noop, 1000) as NodeJS.Timeout;

      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      processor.stop();

      expect(clearIntervalSpy).toHaveBeenCalledTimes(2);
      expect(processor['processingInterval']).toBeNull();
      expect(processor['cleanupInterval']).toBeNull();
    });

    it('should do nothing if stopped when not running', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      processor.stop();
      expect(clearIntervalSpy).not.toHaveBeenCalled();
    });
  });

  describe('III. Distributed Locking & Concurrency Control', () => {
    describe('acquireProcessingLockForSegment', () => {
      it.each([
        {
          scenario: 'acquired successfully',
          mockSetResult: 'OK',
          expectedResult: true,
        },
        {
          scenario: 'fails when already locked',
          mockSetResult: null,
          expectedResult: false,
        },
      ])(
        'should return $expectedResult when lock acquisition $scenario',
        async ({ mockSetResult, expectedResult }) => {
          mockRedis.set.mockResolvedValue(mockSetResult);
          const result = await processor['acquireProcessingLockForSegment']();
          expect(result).toBe(expectedResult);
          expect(mockRedis.set).toHaveBeenCalledWith(
            processor['processorLockKey'],
            processor['processorId'],
            'PX',
            processor['options'].lockDuration,
            'NX',
          );
        },
      );

      it('should respect distributed locking with multiple processors', async () => {
        const processor2 = new MatchmakingProcessor(
          mockWaitingQueueService as WaitingQueueService,
          mockIo,
          { segmentCount: 4 },
        );
        mockRedis.set.mockResolvedValueOnce('OK').mockResolvedValueOnce(null);
        const result1 = await processor['acquireProcessingLockForSegment']();
        const result2 = await processor2['acquireProcessingLockForSegment'](); // processor2 will try for its segment 0
        expect(result1).toBe(true);
        expect(result2).toBe(false); // Assuming both try for segment 0 initially or different segments if rotated. Test focuses on NX behavior.
      });
    });

    describe('acquireProcessingLockWithBackoff', () => {
      it('should succeed immediately if lock is acquired on first try', async () => {
        vi.spyOn(
          processor as any,
          'acquireProcessingLockForSegment',
        ).mockResolvedValue(true);
        const result = await processor['acquireProcessingLockWithBackoff'](3);
        expect(result).toBe(true);
        expect(
          processor['acquireProcessingLockForSegment'],
        ).toHaveBeenCalledTimes(1);
      });

      it('should retry until successful', async () => {
        const lockMock = vi
          .spyOn(processor as any, 'acquireProcessingLockForSegment')
          .mockImplementationOnce(() => Promise.resolve(false))
          .mockImplementationOnce(() => Promise.resolve(false))
          .mockImplementationOnce(() => Promise.resolve(true));
        const resultPromise = processor['acquireProcessingLockWithBackoff'](3);
        await vi.runAllTimersAsync();
        const result = await resultPromise;
        expect(result).toBe(true);
        expect(lockMock).toHaveBeenCalledTimes(3);
      });

      it('should fail after maximum retries', async () => {
        vi.spyOn(
          processor as any,
          'acquireProcessingLockForSegment',
        ).mockResolvedValue(false);
        const resultPromise = processor['acquireProcessingLockWithBackoff'](3);
        await vi.runAllTimersAsync();
        const result = await resultPromise;
        expect(result).toBe(false);
        expect(
          processor['acquireProcessingLockForSegment'],
        ).toHaveBeenCalledTimes(3);
      });

      it('should use exponential backoff timing between retries', async () => {
        const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
        vi.spyOn(processor as any, 'acquireProcessingLockForSegment')
          .mockResolvedValueOnce(false)
          .mockResolvedValueOnce(false)
          .mockResolvedValueOnce(true);
        const promise = processor['acquireProcessingLockWithBackoff'](3);
        await vi.runAllTimersAsync();
        expect(setTimeoutSpy).toHaveBeenNthCalledWith(
          1,
          expect.any(Function),
          50,
        );
        expect(setTimeoutSpy).toHaveBeenNthCalledWith(
          2,
          expect.any(Function),
          100,
        );
        const result = await promise;
        expect(result).toBe(true);
      });
    });

    describe('releaseProcessingLockForSegment', () => {
      it('should release lock using Lua script', async () => {
        await processor['releaseProcessingLockForSegment']();
        expect(mockRedis.eval).toHaveBeenCalledWith(
          expect.stringContaining('if redis.call("get", KEYS[1]) == ARGV[1]'),
          1,
          expect.stringContaining('segment:0:lock'),
          processor['processorId'],
        );
      });
    });

    describe('Lock Watchdog (within processMatches)', () => {
      beforeEach(() => {
        // Common mocks for processMatches tests focusing on watchdog
        vi.spyOn(
          processor as any,
          'acquireProcessingLockWithBackoff',
        ).mockResolvedValue(true);
        vi.spyOn(
          processor as any,
          'releaseProcessingLockForSegment',
        ).mockImplementation(noop);
        // Ensure getQueueMultiSegments is mocked to prevent early exit
        vi.spyOn(processor as any, 'getQueueMultiSegments').mockResolvedValue([
          [
            { userId: 'u1', socketId: 's1', joinedAt: 1 },
            { userId: 'u2', socketId: 's2', joinedAt: 1 },
          ],
        ]);
        vi.spyOn(processor as any, 'findOptimalPairs').mockReturnValue([]); // Assume no pairs to simplify watchdog test
        vi.spyOn(processor as any, 'processBatchMatches').mockResolvedValue({
          successful: 0,
          failed: 0,
        });
        mockWaitingQueueService.getQueueCount = vi.fn().mockResolvedValue(2); // Ensure queue size is sufficient
      });

      it('should set up and clear lock watchdog during processing', async () => {
        vi.spyOn(global, 'setInterval');
        const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

        await processor['processMatches']();

        expect(clearIntervalSpy).toHaveBeenCalledWith(expect.any(Number)); // Expect the watchdog interval to be cleared
        expect(processor['releaseProcessingLockForSegment']).toHaveBeenCalled();
      });

      it('should extend the lock via watchdog during processing', async () => {
        vi.spyOn(global, 'setInterval').mockImplementation((callback) => {
          (callback as any)(); // Immediately execute the watchdog callback
          return 123 as unknown as NodeJS.Timeout;
        });
        // processor['currentSegment'] is 0 initially in beforeEach for the processor instance
        const expectedLockKey = 'matchmaking_processor:segment:0:lock';

        await processor['processMatches']();

        expect(mockRedis.pexpire).toHaveBeenCalledWith(
          expectedLockKey, // Use the captured lock key for the current segment
          processor['options'].lockDuration,
        );
      });
    });
  });

  describe('IV. Segmentation Strategy & Queue Retrieval', () => {
    describe('Segment Rotation & Lock Key', () => {
      it('should rotate segment correctly', () => {
        expect(processor['currentSegment']).toBe(0);
        processor['rotateSegment'](); // 1
        expect(processor['currentSegment']).toBe(1);
        processor['rotateSegment'](); // 2
        expect(processor['currentSegment']).toBe(2);
        processor['rotateSegment'](); // 3
        processor['rotateSegment'](); // 0 (wraps around with segmentCount = 4)
        expect(processor['currentSegment']).toBe(0);
      });

      it('should generate proper lock key for current segment', () => {
        expect(processor['processorLockKey']).toContain('segment:0:lock');
        processor['rotateSegment']();
        expect(processor['processorLockKey']).toContain('segment:1:lock');
      });
    });

    describe('getSegmentationStrategy', () => {
      it.each([
        {
          description: 'small queues (20 users, 4 segments configured)',
          queueSize: 20,
          configuredSegments: 4,
          expected: {
            useSegments: false,
            segmentCount: 1,
            checkWholeThing: true,
          },
        },
        {
          description: 'medium queues (150 users, 4 segments configured)',
          queueSize: 150,
          configuredSegments: 4,
          expected: {
            useSegments: true,
            segmentCount: 4,
            checkWholeThing: false,
          },
        },
        {
          description: 'large queues (500 users, 16 segments configured)',
          queueSize: 500,
          configuredSegments: 16,
          expected: {
            useSegments: true,
            segmentCount: 16,
            checkWholeThing: false,
          },
        },
        {
          description:
            'medium queues (150 users, 16 segments configured, expect reduction to 4)',
          queueSize: 150,
          configuredSegments: 16,
          expected: {
            useSegments: true,
            segmentCount: 4,
            checkWholeThing: false,
          },
        },
      ])(
        'should return correct strategy for $description',
        ({ queueSize, configuredSegments, expected }) => {
          const testProcessor = new MatchmakingProcessor(
            mockWaitingQueueService as WaitingQueueService,
            mockIo,
            { segmentCount: configuredSegments, batchSize: 10, interval: 100 }, // Provide other necessary minimal options
          );
          const strategy = testProcessor['getSegmentationStrategy'](queueSize);
          expect(strategy.useSegments).toBe(expected.useSegments);
          expect(strategy.segmentCount).toBe(expected.segmentCount);
          expect(strategy.checkWholeThing).toBe(expected.checkWholeThing);
        },
      );
    });

    describe('Integration of Segmentation Strategy with processMatches', () => {
      beforeEach(() => {
        // Mock dependencies for processMatches
        vi.spyOn(
          processor as any,
          'acquireProcessingLockWithBackoff',
        ).mockResolvedValue(true);
        vi.spyOn(
          processor as any,
          'releaseProcessingLockForSegment',
        ).mockImplementation(noop);
        vi.spyOn(processor as any, 'findOptimalPairs').mockReturnValue([]);
        vi.spyOn(processor as any, 'processBatchMatches').mockResolvedValue({
          successful: 0,
          failed: 0,
        });
      });

      it('should transition strategies when queue size crosses thresholds', async () => {
        mockWaitingQueueService.getQueueCount = vi
          .fn()
          .mockResolvedValueOnce(29); // Small
        const getQueueMultiSegmentsSpy = vi
          .spyOn(processor as any, 'getQueueMultiSegments')
          .mockResolvedValue([[]]);

        await processor['processMatches']();
        expect(getQueueMultiSegmentsSpy).toHaveBeenCalledWith(
          1,
          expect.any(Number),
          0,
        ); // Force segment 0

        getQueueMultiSegmentsSpy.mockClear();
        mockWaitingQueueService.getQueueCount = vi
          .fn()
          .mockResolvedValueOnce(35); // Medium

        await processor['processMatches']();
        expect(getQueueMultiSegmentsSpy).toHaveBeenCalledWith(
          1,
          expect.any(Number),
          undefined,
        ); // Use current segment
      });

      it('should start from segment 0 when queue size is small, regardless of currentSegment', async () => {
        mockWaitingQueueService.getQueueCount = vi.fn().mockResolvedValue(2); // Small queue
        processor['currentSegment'] = 3; // Set current segment to non-zero
        const getQueueMultiSegmentsSpy = vi
          .spyOn(processor as any, 'getQueueMultiSegments')
          .mockResolvedValue([[]]);

        await processor['processMatches']();
        expect(getQueueMultiSegmentsSpy).toHaveBeenCalledWith(
          1,
          expect.any(Number),
          0,
        ); // Should force segment 0
      });
    });

    describe('getQueueMultiSegments', () => {
      it.each([
        {
          description: 'fetch a single segment correctly',
          segmentsToFetch: 1,
          segmentSize: 10,
          forceStartSegment: undefined,
          currentSegment: 0,
          mockPipelineExec: () =>
            mockRedis
              .pipeline()
              .exec.mockResolvedValue([
                [
                  null,
                  ['socket1__:__user1', '100', 'socket2__:__user2', '200'],
                ],
              ]),
          mockSplitKeyImpls: [
            () => ({ socketId: 'socket1', userId: 'user1' }),
            () => ({ socketId: 'socket2', userId: 'user2' }),
          ],
          expectedSegmentsLength: 1,
          expectedSegment0Length: 2,
          expectedUserIds: [['user1', 'user2']],
          expectedZRangeCalls: [{ start: 0, end: 9 }],
        },
        {
          description: 'fetch multiple segments correctly',
          segmentsToFetch: 2,
          segmentSize: 10,
          forceStartSegment: undefined,
          currentSegment: 0,
          mockPipelineExec: () =>
            mockRedis.pipeline().exec.mockResolvedValue([
              [null, ['socket1__:__user1', '100']], // Segment 0
              [null, ['socket3__:__user3', '300']], // Segment 1
            ]),
          mockSplitKeyImpls: [
            () => ({ socketId: 'socket1', userId: 'user1' }),
            () => ({ socketId: 'socket3', userId: 'user3' }),
          ],
          expectedSegmentsLength: 2,
          expectedSegment0Length: 1,
          expectedSegment1Length: 1,
          expectedUserIds: [['user1'], ['user3']],
          expectedZRangeCalls: [
            { start: 0, end: 9 }, // Segment 0
            { start: 10, end: 19 }, // Segment 1
          ],
        },
        {
          description: 'use forceStartSegment when provided',
          segmentsToFetch: 1,
          segmentSize: 10,
          forceStartSegment: 2, // Force start from segment 2
          currentSegment: 0, // Current segment is 0, but should be overridden
          mockPipelineExec: () =>
            mockRedis
              .pipeline()
              .exec.mockResolvedValue([[null, ['socket1__:__user1', '100']]]),
          mockSplitKeyImpls: [() => ({ socketId: 'socket1', userId: 'user1' })],
          expectedSegmentsLength: 1,
          expectedSegment0Length: 1,
          expectedUserIds: [['user1']],
          expectedZRangeCalls: [
            { start: 20, end: 29 }, // Segment 2 (0-indexed, so 2*10)
          ],
        },
        {
          description:
            'handle Redis errors gracefully by returning empty segments',
          segmentsToFetch: 2,
          segmentSize: 10,
          forceStartSegment: undefined,
          currentSegment: 0,
          mockPipelineExec: () =>
            mockRedis.pipeline().exec.mockResolvedValue(null), // Simulate Redis error
          mockSplitKeyImpls: [],
          expectedSegmentsLength: 2,
          expectedSegment0Length: 0,
          expectedSegment1Length: 0,
          expectedUserIds: [[], []],
          expectedZRangeCalls: [
            { start: 0, end: 9 },
            { start: 10, end: 19 },
          ],
        },
      ])(
        'should $description',
        async ({
          segmentsToFetch,
          segmentSize,
          forceStartSegment,
          currentSegment,
          mockPipelineExec,
          mockSplitKeyImpls,
          expectedSegmentsLength,
          expectedSegment0Length,
          expectedSegment1Length,
          expectedUserIds,
          expectedZRangeCalls,
        }) => {
          // Setup mocks for this specific test case
          mockRedis.pipeline = vi.fn().mockReturnValue({
            zrange: vi.fn().mockReturnThis(),
            exec: vi.fn(), // This will be set by mockPipelineExec
          });
          mockPipelineExec(); // Apply the specific exec mock for the test case

          if (mockSplitKeyImpls && mockSplitKeyImpls.length > 0) {
            let callCount = 0;
            mockWaitingQueueService.splitRedisKey = vi.fn(() => {
              const impl = mockSplitKeyImpls[callCount];
              callCount++;
              return impl ? impl() : { socketId: 'default', userId: 'default' };
            });
          } else {
            mockWaitingQueueService.splitRedisKey = vi
              .fn()
              .mockReturnValue({ socketId: 'default', userId: 'default' });
          }

          processor['currentSegment'] = currentSegment;

          const segments = await processor['getQueueMultiSegments'](
            segmentsToFetch,
            segmentSize,
            forceStartSegment,
          );

          expect(segments.length).toBe(expectedSegmentsLength);
          if (expectedSegment0Length !== undefined) {
            expect(segments[0]?.length ?? 0).toBe(expectedSegment0Length);
          }
          if (expectedSegment1Length !== undefined) {
            expect(segments[1]?.length ?? 0).toBe(expectedSegment1Length);
          }

          expectedUserIds.forEach((userIdsInSegment, segmentIndex) => {
            if (segments[segmentIndex]) {
              expect(segments[segmentIndex].map((u) => u.userId)).toEqual(
                userIdsInSegment,
              );
            }
          });

          const zrangeSpy = mockRedis.pipeline().zrange;
          expect(zrangeSpy).toHaveBeenCalledTimes(expectedZRangeCalls.length);
          expectedZRangeCalls.forEach((call, index) => {
            expect(zrangeSpy).toHaveBeenNthCalledWith(
              index + 1,
              'waiting_queue',
              call.start,
              call.end,
              'WITHSCORES',
            );
          });
        },
      );
    });
  });

  describe('V. Core Matchmaking Logic', () => {
    describe('A. Compatibility Data & Caching', () => {
      it.each([
        {
          description: 'return empty map for empty items array',
          items: [],
          cachedData: {},
          mockIgnoredPairs: [],
          expectedFetchedUsers: [],
          expectedIgnoreMapSize: 0,
        },
        {
          description: 'build ignore map and update cache on cache miss',
          items: [{ userId: 'user1', socketId: 's1', joinedAt: Date.now() }],
          cachedData: {},
          mockIgnoredPairs: [['user1', 'user2']],
          expectedFetchedUsers: ['user1'],
          expectedIgnoreMapSize: 1,
          expectedUser1IgnoresUser2: true,
          expectCacheUpdateForUser1: true,
        },
        {
          description: 'use cached data when available and not expired',
          items: [{ userId: 'user1', socketId: 's1', joinedAt: Date.now() }],
          cachedData: {
            user1: { data: new Set(['user3']), expiry: Date.now() + 10000 },
          },
          mockIgnoredPairs: [],
          expectedFetchedUsers: [], // Should not fetch user1
          expectedIgnoreMapSize: 1,
          expectedUser1IgnoresUser3: true,
          expectCacheUpdateForUser1: false, // No update as it was a cache hit
        },
        {
          description: 'refresh expired cache entries',
          items: [{ userId: 'user1', socketId: 's1', joinedAt: Date.now() }],
          cachedData: {
            user1: { data: new Set(['oldUser']), expiry: Date.now() - 1000 }, // Expired
          },
          mockIgnoredPairs: [['user1', 'newUser']],
          expectedFetchedUsers: ['user1'],
          expectedIgnoreMapSize: 1,
          expectedUser1IgnoresNewUser: true,
          expectedUser1NotIgnoresOldUser: true, // oldUser should be gone
          expectCacheUpdateForUser1: true,
        },
      ])(
        'preloadCompatibilityData: should $description',
        async ({
          items,
          cachedData,
          mockIgnoredPairs,
          expectedFetchedUsers,
          expectedIgnoreMapSize,
          expectedUser1IgnoresUser2,
          expectedUser1IgnoresUser3,
          expectedUser1IgnoresNewUser,
          expectedUser1NotIgnoresOldUser,
          expectCacheUpdateForUser1,
        }) => {
          const now = Date.now();
          // Populate cache
          processor['compatibilityCache'].clear(); // Clear cache before each test run
          for (const userId in cachedData) {
            processor['compatibilityCache'].set(
              userId,
              (cachedData as any)[userId],
            );
          }
          getIgnoredPairsForUsersSpy.mockResolvedValueOnce(mockIgnoredPairs);

          const ignoreMap = await processor['preloadCompatibilityData'](
            items as any,
          );

          expect(ignoreMap.size).toBe(expectedIgnoreMapSize);
          if (expectedFetchedUsers.length > 0) {
            expect(getIgnoredPairsForUsersSpy).toHaveBeenCalledWith(
              expectedFetchedUsers,
            );
          } else {
            expect(getIgnoredPairsForUsersSpy).not.toHaveBeenCalled();
          }

          if (expectedUser1IgnoresUser2) {
            expect(ignoreMap.get('user1')?.has('user2')).toBe(true);
          }
          if (expectedUser1IgnoresUser3) {
            expect(ignoreMap.get('user1')?.has('user3')).toBe(true);
          }
          if (expectedUser1IgnoresNewUser) {
            expect(ignoreMap.get('user1')?.has('newUser')).toBe(true);
          }
          if (expectedUser1NotIgnoresOldUser) {
            expect(ignoreMap.get('user1')?.has('oldUser')).toBe(false);
          }

          if (
            expectCacheUpdateForUser1 &&
            items.find((item) => item.userId === 'user1')
          ) {
            const cached = processor['compatibilityCache'].get('user1');
            expect(cached).toBeDefined();
            if (expectedUser1IgnoresNewUser) {
              expect(cached?.data.has('newUser')).toBe(true);
            }
            expect(cached?.expiry).toBeGreaterThanOrEqual(
              now + processor['options'].compabilityCacheTtlMS - 1000,
            ); // Allow small delta for execution time
          } else if (
            items.find((item) => item.userId === 'user1') &&
            cachedData['user1']
          ) {
            // If cache was hit, ensure expiry wasn't unnecessarily updated
            const cached = processor['compatibilityCache'].get('user1');
            expect(cached?.expiry).toBe((cachedData as any)['user1'].expiry);
          }
        },
      );
    });

    describe('B. Scoring & Pairing Algorithms', () => {
      describe('calculateCompatibilityScore', () => {
        const currentTime = 1620000000;
        // Test processor uses default options:
        // secondsPerWaitScorePoint: 10
        // maxWaitTimeScorePoints: 3

        const baseUser1 = {
          userId: 'user1',
          socketId: 's1',
          joinedAt: currentTime - 20, // 20s wait => 20/10 = 2 points
        };
        const baseUser2 = {
          userId: 'user2',
          socketId: 's2',
          joinedAt: currentTime - 15, // 15s wait => 15/10 = 1.5 points
        };
        const longWaitUser = {
          userId: 'user3',
          socketId: 's3',
          joinedAt: currentTime - 600, // 600s wait => 600/10 = 60 points, capped at 3
        };

        it.each([
          {
            description: 'users ignore each other',
            userA: baseUser1,
            userB: baseUser2,
            ignoreMap: new Map<string, Set<string>>([
              ['user1', new Set(['user2'])],
            ]),
            expectedScore: 0,
          },
          {
            description: 'standard waiting time calculation',
            userA: baseUser1, // 2 points
            userB: baseUser2, // 1.5 points
            ignoreMap: new Map<string, Set<string>>(),
            expectedScore: 3.5, // 2 + 1.5
          },
          {
            description: 'one user hits individual wait time cap',
            userA: longWaitUser, // 3 points (capped by default maxWaitTimeScorePoints)
            userB: baseUser1, // 2 points
            ignoreMap: new Map<string, Set<string>>(),
            expectedScore: 5, // 3 + 2 (WAS 7)
          },
          {
            description: 'both users hit individual wait time cap',
            userA: longWaitUser, // 3 points (capped)
            userB: {
              ...longWaitUser, // also capped at 3 points
              userId: 'user4',
              socketId: 's4',
              joinedAt: currentTime - 700, // 70s wait, capped at 3 points
            },
            ignoreMap: new Map<string, Set<string>>(),
            expectedScore: 6, // 3 + 3 (WAS 10)
          },
        ])(
          'should return $expectedScore when $description',
          ({ userA, userB, ignoreMap, expectedScore }) => {
            // Use the main 'processor' instance for this test, as its options are set in beforeEach
            const score = processor['calculateCompatibilityScore'](
              userA,
              userB,
              ignoreMap,
              currentTime,
            );
            expect(score).toBeCloseTo(expectedScore);
          },
        );
      });

      describe('findOptimalPairs', () => {
        const currentTime = 1620000000;

        it('should group users by wait time buckets and process in order when minUsersForTieredBucketing is met', () => {
          // Create a specific processor for this test to override minUsersForTieredBucketing
          const testProcessor = new MatchmakingProcessor(
            mockWaitingQueueService as WaitingQueueService,
            mockIo,
            { minUsersForTieredBucketing: 2 }, // Force tiering with few users
          );
          const users = [
            { userId: 'critical', socketId: 'sc', joinedAt: currentTime - 150 }, // critical
            { userId: 'high', socketId: 'sh', joinedAt: currentTime - 60 }, // high
            { userId: 'medium', socketId: 'sm', joinedAt: currentTime - 20 }, // medium
            { userId: 'normal', socketId: 'sn', joinedAt: currentTime - 5 }, // normal
          ];
          const matchInGroupSpy = vi
            .spyOn(testProcessor as any, 'matchUsersInGroup')
            .mockImplementation(noop);
          testProcessor['findOptimalPairs'](users, new Map(), currentTime);

          expect(matchInGroupSpy).toHaveBeenCalledTimes(4); // critical, high, medium, normal
          expect((matchInGroupSpy.mock.calls[0][0] as any)[0].userId).toBe(
            'critical',
          );
          expect((matchInGroupSpy.mock.calls[1][0] as any)[0].userId).toBe(
            'high',
          );
          // Add checks for medium and normal if necessary
          expect((matchInGroupSpy.mock.calls[2][0] as any)[0].userId).toBe(
            'medium',
          );
          expect((matchInGroupSpy.mock.calls[3][0] as any)[0].userId).toBe(
            'normal',
          );
        });

        it('should call matchUsersInGroup once if minUsersForTieredBucketing is NOT met (using default processor config)', () => {
          // The global 'processor' instance uses default minUsersForTieredBucketing = 30
          const fewUsers = [
            { userId: 'critical', socketId: 'sc', joinedAt: currentTime - 150 },
            { userId: 'high', socketId: 'sh', joinedAt: currentTime - 60 },
          ]; // Only 2 users, less than default 30
          const matchInGroupSpy = vi
            .spyOn(processor as any, 'matchUsersInGroup')
            .mockImplementation(noop);

          processor['findOptimalPairs'](fewUsers, new Map(), currentTime);

          expect(matchInGroupSpy).toHaveBeenCalledTimes(1);
          expect((matchInGroupSpy.mock.calls[0][0] as any).length).toBe(
            fewUsers.length,
          );
          expect(matchInGroupSpy.mock.calls[0][0] as any).toEqual(
            expect.arrayContaining(fewUsers),
          );
        });

        it('should respect bucket size limits when minUsersForTieredBucketing is met', () => {
          // Create a specific processor for this test
          const testProcessorWithLimits = new MatchmakingProcessor(
            mockWaitingQueueService as WaitingQueueService,
            mockIo,
            {
              minUsersForTieredBucketing: 2, // Force tiering
              bucketSizeLimits: { critical: 1, high: 1, medium: 1, normal: 1 },
            },
          );
          const users = [
            { userId: 'c1', socketId: 'sc1', joinedAt: currentTime - 150 }, // critical
            { userId: 'c2', socketId: 'sc2', joinedAt: currentTime - 140 }, // critical
            { userId: 'h1', socketId: 'sh1', joinedAt: currentTime - 60 }, // high
            { userId: 'h2', socketId: 'sh2', joinedAt: currentTime - 50 }, // high
            // Add more for other tiers if needed to fully test limits
          ];
          const matchInGroupSpy = vi
            .spyOn(testProcessorWithLimits as any, 'matchUsersInGroup')
            .mockImplementation(noop);

          testProcessorWithLimits['findOptimalPairs'](
            users,
            new Map(),
            currentTime,
          );

          // It will call matchUsersInGroup for each tier that has users, up to 4 times
          // Check critical bucket (first call to matchUsersInGroup)
          // Users c1, c2 are critical. Limit is 1.
          expect(
            (matchInGroupSpy.mock.calls[0][0] as any).length,
          ).toBeLessThanOrEqual(1);
          // Check high bucket (second call to matchUsersInGroup)
          // Users h1, h2 are high. Limit is 1.
          expect(
            (matchInGroupSpy.mock.calls[1][0] as any).length,
          ).toBeLessThanOrEqual(1);
        });
      });

      describe('matchUsersInGroup (including spatial partitioning)', () => {
        const currentTime = 1620000000;
        const ignoreMap = new Map<string, Set<string>>();
        let usedIds: Set<string>;
        let pairs: [any, any][];

        beforeEach(() => {
          usedIds = new Set<string>();
          pairs = [];
        });

        it('should match users based on compatibility score', () => {
          const users = [
            { userId: 'u1', socketId: 's1', joinedAt: currentTime - 50 },
            { userId: 'u2', socketId: 's2', joinedAt: currentTime - 40 },
            { userId: 'u3', socketId: 's3', joinedAt: currentTime - 30 },
            { userId: 'u4', socketId: 's4', joinedAt: currentTime - 20 },
          ];
          vi.spyOn(
            processor as any,
            'calculateCompatibilityScore',
          ).mockImplementation((u1: any, u2: any) => {
            if (
              (u1.userId === 'u1' && u2.userId === 'u2') ||
              (u1.userId === 'u2' && u2.userId === 'u1')
            )
              return 10;
            if (
              (u1.userId === 'u3' && u2.userId === 'u4') ||
              (u1.userId === 'u4' && u2.userId === 'u3')
            )
              return 5;
            return 0;
          });
          processor['matchUsersInGroup'](
            users,
            pairs,
            usedIds,
            ignoreMap,
            currentTime,
          );
          expect(pairs).toHaveLength(2); // u1-u2 and u3-u4
          expect(usedIds.size).toBe(4);
        });

        it('should respect the maxLookAhead limit', () => {
          const users = Array.from({ length: 60 }, (_, i) => ({
            userId: `u${i}`,
            socketId: `s${i}`,
            joinedAt: currentTime - i,
          }));
          processor['options'].maxLookAhead = 10; // Set a small lookahead for testing
          const calcSpy = vi
            .spyOn(processor as any, 'calculateCompatibilityScore')
            .mockReturnValue(5);

          processor['matchUsersInGroup'](
            users,
            pairs,
            usedIds,
            ignoreMap,
            currentTime,
          );

          const furthestLookahead = Math.max(
            ...calcSpy.mock.calls.map(([u1, u2]) =>
              Math.abs(
                parseInt((u2 as any).userId.replace('u', '')) -
                  parseInt((u1 as any).userId.replace('u', '')),
              ),
            ),
          );
          expect(furthestLookahead).toBeLessThanOrEqual(
            processor['options'].maxLookAhead,
          );
        });

        it('spatial partitioning: should match within the same 5-second wait time bucket first', () => {
          const users = [
            { userId: 'u1', socketId: 's1', joinedAt: currentTime - 5 }, // Bucket A (5s)
            { userId: 'u2', socketId: 's2', joinedAt: currentTime - 6 }, // Bucket A (5s)
            { userId: 'u3', socketId: 's3', joinedAt: currentTime - 10 }, // Bucket B (10s)
            { userId: 'u4', socketId: 's4', joinedAt: currentTime - 11 }, // Bucket B (10s)
          ];
          vi.spyOn(
            processor as any,
            'calculateCompatibilityScore',
          ).mockReturnValue(10); // Assume all are compatible
          processor['matchUsersInGroup'](
            users,
            pairs,
            usedIds,
            ignoreMap,
            currentTime,
          );
          expect(pairs).toHaveLength(2);
          const pairUserIds = pairs.map((p) =>
            [p[0].userId, p[1].userId].sort(),
          );
          expect(pairUserIds).toContainEqual(['u1', 'u2']);
          expect(pairUserIds).toContainEqual(['u3', 'u4']);
        });

        it('spatial partitioning: should match with adjacent buckets if no match in same bucket', () => {
          const users = [
            { userId: 'u1', socketId: 's1', joinedAt: currentTime - 5 }, // Bucket A
            { userId: 'u2', socketId: 's2', joinedAt: currentTime - 10 }, // Bucket B (adjacent)
            { userId: 'u3', socketId: 's3', joinedAt: currentTime - 25 }, // Bucket C (not adjacent to A)
          ];
          vi.spyOn(
            processor as any,
            'calculateCompatibilityScore',
          ).mockImplementation((u1: any, u2: any) => {
            // Only u1 and u2 are compatible
            if (
              (u1.userId === 'u1' && u2.userId === 'u2') ||
              (u1.userId === 'u2' && u2.userId === 'u1')
            )
              return 10;
            return 0;
          });
          processor['matchUsersInGroup'](
            users,
            pairs,
            usedIds,
            ignoreMap,
            currentTime,
          );
          expect(pairs).toHaveLength(1);
          expect(
            pairs[0][0].userId === 'u1' || pairs[0][1].userId === 'u1',
          ).toBe(true);
          expect(
            pairs[0][0].userId === 'u2' || pairs[0][1].userId === 'u2',
          ).toBe(true);
        });
      });
    });

    describe('C. Atomic Match Creation (Lua)', () => {
      const sampleMatches = [
        {
          user1: { userId: 'u1', socketId: 's1', joinedAt: 1 },
          user2: { userId: 'u2', socketId: 's2', joinedAt: 1 },
          roomId: 'room1',
        },
      ];

      it.each([
        {
          description:
            'call Redis eval with correct script and args for successful match creation',
          matchesToCreate: sampleMatches,
          mockEvalResult: () => mockRedis.eval.mockResolvedValue('1'), // 1 successful match
          expectedReturnValue: 1,
          expectEvalCalled: true,
        },
        {
          description: 'handle Redis eval errors and return 0',
          matchesToCreate: sampleMatches,
          mockEvalResult: () =>
            mockRedis.eval.mockRejectedValue(new Error('Redis error')),
          expectedReturnValue: 0,
          expectEvalCalled: true,
        },
      ])(
        '$description',
        async ({
          matchesToCreate,
          mockEvalResult,
          expectedReturnValue,
          expectEvalCalled,
        }) => {
          mockEvalResult();
          const result =
            await processor['createMatchesWithLua'](matchesToCreate);
          expect(result).toBe(expectedReturnValue);
          if (expectEvalCalled) {
            expect(mockRedis.eval).toHaveBeenCalledWith(
              expect.stringContaining('local queueKey = KEYS[1]'),
              2,
              'waiting_queue',
              'match_assignments',
              processor['options'].matchDataTTL.toString(),
              '__:__',
              's1',
              'u1',
              's2',
              'u2',
              'room1',
            );
          } else {
            expect(mockRedis.eval).not.toHaveBeenCalled();
          }
        },
      );

      it('createMatchesWithLua: should return 0 if no matches provided', async () => {
        const result = await processor['createMatchesWithLua']([]);
        expect(result).toBe(0);
        expect(mockRedis.eval).not.toHaveBeenCalled();
      });
    });
  });

  describe('VI. Main Processing Workflow (processMatches)', () => {
    // These are high-level integration tests.
    // Individual components (locking, queue retrieval, pairing, batching) are tested in their respective sections.
    beforeEach(() => {
      vi.spyOn(
        processor as any,
        'acquireProcessingLockWithBackoff',
      ).mockResolvedValue(true);
      vi.spyOn(
        processor as any,
        'releaseProcessingLockForSegment',
      ).mockImplementation(noop);
      // getQueueMultiSegments will be spied on in specific tests
      // findOptimalPairs will be spied on in specific tests
      // processBatchMatches will be spied on in specific tests
    });

    it('should do nothing if lock is not acquired', async () => {
      vi.spyOn(
        processor as any,
        'acquireProcessingLockWithBackoff',
      ).mockResolvedValue(false);
      const getQueueSpy = vi.spyOn(processor as any, 'getQueueMultiSegments');
      const getQueueCountSpy = vi.spyOn(
        mockWaitingQueueService,
        'getQueueCount',
      );
      await processor['processMatches']();
      expect(getQueueCountSpy).not.toHaveBeenCalled(); // Should not even check queue size
      expect(getQueueSpy).not.toHaveBeenCalled();
      expect(
        processor['releaseProcessingLockForSegment'],
      ).not.toHaveBeenCalled(); // Lock wasn't acquired
    });

    it('should process an empty queue/segment correctly', async () => {
      mockWaitingQueueService.getQueueCount = vi.fn().mockResolvedValue(1); // Less than 2 users
      const getQueueSpy = vi.spyOn(processor as any, 'getQueueMultiSegments');
      const findPairsSpy = vi.spyOn(processor as any, 'findOptimalPairs');

      await processor['processMatches']();

      expect(mockWaitingQueueService.getQueueCount).toHaveBeenCalled();
      expect(getQueueSpy).not.toHaveBeenCalled(); // Should return early
      expect(findPairsSpy).not.toHaveBeenCalled(); // No items to find pairs from
      expect(processor['releaseProcessingLockForSegment']).toHaveBeenCalled();
      expect(processor['currentSegment']).toBe(1); // Rotated segment
    });

    it('should handle a segment with users but no pairs found', async () => {
      mockWaitingQueueService.getQueueCount = vi.fn().mockResolvedValue(2);
      const mockItems = [
        [
          { userId: 'u1', socketId: 's1', joinedAt: 1 },
          { userId: 'u2', socketId: 's2', joinedAt: 1 },
        ],
      ];
      vi.spyOn(processor as any, 'getQueueMultiSegments').mockResolvedValue(
        mockItems,
      );
      getIgnoredPairsForUsersSpy.mockResolvedValue([]);
      vi.spyOn(processor as any, 'findOptimalPairs').mockReturnValue([]); // No pairs found
      const processBatchSpy = vi
        .spyOn(processor as any, 'processBatchMatches')
        .mockResolvedValue({ successful: 0, failed: 0 });

      await processor['processMatches']();

      expect(processor['findOptimalPairs']).toHaveBeenCalledWith(
        mockItems[0],
        expect.any(Map),
        expect.any(Number),
      );
      expect(processBatchSpy).toHaveBeenCalledWith([]); // Called with empty array
      expect(processor['releaseProcessingLockForSegment']).toHaveBeenCalled();
    });

    it('should successfully process a segment with users and create matches', async () => {
      mockWaitingQueueService.getQueueCount = vi.fn().mockResolvedValue(2);
      const user1 = { userId: 'u1', socketId: 's1', joinedAt: 1 };
      const user2 = { userId: 'u2', socketId: 's2', joinedAt: 1 };
      vi.spyOn(processor as any, 'getQueueMultiSegments').mockResolvedValue([
        [user1, user2],
      ]);
      vi.spyOn(processor as any, 'preloadCompatibilityData').mockResolvedValue(
        new Map(),
      );
      vi.spyOn(processor as any, 'findOptimalPairs').mockReturnValue([
        [user1, user2],
      ]);
      const processBatchSpy = vi
        .spyOn(processor as any, 'processBatchMatches')
        .mockResolvedValue({ successful: 1, failed: 0 }); // 1 pair successfully matched

      await processor['processMatches']();

      expect(processBatchSpy).toHaveBeenCalledWith([[user1, user2]]);
      expect(processor['stats'].successCount).toBe(2); // 1 pair = 2 users
      expect(processor['releaseProcessingLockForSegment']).toHaveBeenCalled();
    });
  });

  describe('VII. Batch Match Processing (processBatchMatches)', () => {
    const user1 = { userId: 'u1', socketId: 's1', joinedAt: 1 };
    const user2 = { userId: 'u2', socketId: 's2', joinedAt: 1 };
    const user3 = { userId: 'u3', socketId: 's3', joinedAt: 1 };
    const user4 = { userId: 'u4', socketId: 's4', joinedAt: 1 };

    beforeEach(() => {
      // Mock Redis pipeline for availability checks
      // Default to users being available
      mockRedis.pipeline = vi.fn().mockImplementation(() => ({
        zscore: vi.fn().mockReturnThis(),
        hexists: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([
          [null, '123'],
          [null, 0], // User A available
          [null, '456'],
          [null, 0], // User B available
        ]),
      }));
      vi.spyOn(processor as any, 'createMatchesWithLua').mockResolvedValue(1); // Assume Lua script succeeds for 1 pair
    });

    it('should process a batch of pairs, check availability, create matches via Lua, and notify', async () => {
      const pairs: [any, any][] = [[user1, user2]];
      const result = await processor['processBatchMatches'](pairs);

      expect(mockRedis.pipeline).toHaveBeenCalledTimes(1); // For availability check of the batch
      expect(processor['createMatchesWithLua']).toHaveBeenCalledWith([
        expect.objectContaining({ user1, user2, roomId: expect.any(String) }),
      ]);
      expect(mockIo.to).toHaveBeenCalledWith(user1.socketId);
      expect(mockIo.to).toHaveBeenCalledWith(user2.socketId);
      expect(mockIo.emit).toHaveBeenCalledWith(
        'match-found',
        expect.any(String), // roomId
        user2.socketId,
        user2.userId,
        true, // isInitiator for user1
      );
      expect(mockIo.emit).toHaveBeenCalledWith(
        'match-found',
        expect.any(String), // roomId
        user1.socketId,
        user1.userId,
        false, // isInitiator for user2
      );
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should handle unavailable users and not attempt to match them', async () => {
      const pairs: [any, any][] = [
        [user1, user2], // Available
        [user3, user4], // User3 will be unavailable
      ];
      // Mock pipeline results:
      // 1st call (user1, user2): both available
      // 2nd call (user3, user4): user3 not in queue (zscore is null)
      mockRedis.pipeline = vi.fn().mockImplementation(() => ({
        zscore: vi.fn().mockReturnThis(),
        hexists: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValueOnce([
          // For user1, user2 in the first (and only) batch
          [null, '123'], // user1 zscore
          [null, 0], // user1 hexists (no match)
          [null, '456'], // user2 zscore
          [null, 0], // user2 hexists (no match)
          // For user3, user4 in the same batch
          [null, null], // user3 zscore (not in queue)
          [null, 0], // user3 hexists
          [null, '789'], // user4 zscore
          [null, 0], // user4 hexists
        ]),
      }));

      // createMatchesWithLua should only be called with the available pair
      const createMatchesSpy = vi
        .spyOn(processor as any, 'createMatchesWithLua')
        .mockResolvedValue(1); // Lua confirms 1 match (user1, user2)

      const result = await processor['processBatchMatches'](pairs);

      expect(mockRedis.pipeline).toHaveBeenCalledTimes(1); // Called once for the batch of 2 pairs
      expect(createMatchesSpy).toHaveBeenCalledTimes(1);
      expect(createMatchesSpy).toHaveBeenCalledWith([
        expect.objectContaining({ user1, user2 }),
      ]);
      expect(result.successful).toBe(1); // user1-user2 pair
      expect(result.failed).toBe(1); // user3-user4 pair failed
    });
    it('should handle Lua script failing to create matches', async () => {
      const pairs: [any, any][] = [[user1, user2]];
      vi.spyOn(processor as any, 'createMatchesWithLua').mockResolvedValue(0); // Lua script reports 0 matches

      const result = await processor['processBatchMatches'](pairs);

      expect(mockIo.to).not.toHaveBeenCalled(); // No notifications if Lua fails
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1); // The pair failed because Lua didn't create it
    });
  });

  describe('VIII. Background Cleanup Tasks', () => {
    describe('startPeriodicCleanup', () => {
      it('should set up an interval for cleanup tasks', () => {
        processor['startPeriodicCleanup']();
        expect(global.setInterval).toHaveBeenCalledWith(
          expect.any(Function),
          processor['options'].cleanupInterval,
        );
        expect(processor['cleanupInterval']).toBeTruthy();
      });

      it('should clear existing cleanup interval before setting a new one', () => {
        processor['cleanupInterval'] = 101 as unknown as NodeJS.Timeout; // Existing timer
        const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
        processor['startPeriodicCleanup']();
        expect(clearIntervalSpy).toHaveBeenCalledWith(
          101 as unknown as NodeJS.Timeout,
        );
        expect(processor['cleanupInterval']).not.toBe(
          101 as unknown as NodeJS.Timeout,
        ); // New timer set
      });

      it('should trigger cleanupZombieMatches, cleanupOrphanedLocks, and cleanupStaleUsersInQueue when interval executes', async () => {
        const zombieSpy = vi
          .spyOn(processor as any, 'cleanupZombieMatches')
          .mockResolvedValue(0);
        const orphanedSpy = vi
          .spyOn(processor as any, 'cleanupOrphanedLocks')
          .mockResolvedValue(0);
        const staleUsersSpy = vi
          .spyOn(processor as any, 'cleanupStaleUsersInQueue')
          .mockResolvedValue(0);

        let capturedCallback: any;
        vi.spyOn(global, 'setInterval').mockImplementation((callback) => {
          capturedCallback = callback;
          return 123 as unknown as NodeJS.Timeout;
        });

        processor['startPeriodicCleanup']();
        await capturedCallback(); // Manually trigger the interval callback

        expect(zombieSpy).toHaveBeenCalled();
        expect(orphanedSpy).toHaveBeenCalled();
        expect(staleUsersSpy).toHaveBeenCalled();
      });
    });

    describe('cleanupZombieMatches', () => {
      const matchAssignmentsKey = 'match_assignments'; // As used by WaitingQueueService
      const defaultHscanCount = 50; // Default from options

      beforeEach(() => {
        // Ensure the processor's waitingQueueService has the key defined for the test
        (processor['waitingQueueService'] as any).matchAssignmentsKey =
          matchAssignmentsKey!;
        // Reset eval mock for each test to avoid interference
        mockRedis.eval = vi.fn();
      });

      it('should execute Lua script with HSCAN and return count of cleaned matches (single scan)', async () => {
        mockRedis.eval.mockResolvedValue(['0', 3]); // cursor '0', 3 cleaned

        const result = await processor['cleanupZombieMatches']();

        expect(result).toBe(3);
        expect(mockRedis.eval).toHaveBeenCalledTimes(1);
        expect(mockRedis.eval).toHaveBeenCalledWith(
          expect.stringContaining('HSCAN'), // Check if the new Lua script is used
          1,
          matchAssignmentsKey,
          '0', // Initial cursor
          defaultHscanCount.toString(), // Default hscan count
        );
      });

      it('should execute Lua script with HSCAN multiple times if cursor is not 0', async () => {
        mockRedis.eval
          .mockResolvedValueOnce(['nextCursor123', 2]) // First scan, 2 cleaned, new cursor
          .mockResolvedValueOnce(['0', 1]); // Second scan, 1 cleaned, cursor '0'

        const result = await processor['cleanupZombieMatches']();

        expect(result).toBe(3); // 2 + 1
        expect(mockRedis.eval).toHaveBeenCalledTimes(2);
        expect(mockRedis.eval).toHaveBeenNthCalledWith(
          1,
          expect.stringContaining('HSCAN'),
          1,
          matchAssignmentsKey,
          '0',
          defaultHscanCount.toString(),
        );
        expect(mockRedis.eval).toHaveBeenNthCalledWith(
          2,
          expect.stringContaining('HSCAN'),
          1,
          matchAssignmentsKey,
          'nextCursor123', // Cursor from previous call
          defaultHscanCount.toString(),
        );
      });

      it('should use hscanCountForCleanup from options if provided', async () => {
        const customHscanCount = 20;
        processor['options'].hscanCountForCleanup = customHscanCount;
        mockRedis.eval.mockResolvedValue(['0', 1]);

        await processor['cleanupZombieMatches']();

        expect(mockRedis.eval).toHaveBeenCalledWith(
          expect.stringContaining('HSCAN'),
          1,
          matchAssignmentsKey,
          '0',
          customHscanCount.toString(), // Custom hscan count
        );
        // Reset for other tests
        processor['options'].hscanCountForCleanup = defaultHscanCount;
      });

      it('should handle Redis errors during HSCAN and return count cleaned so far', async () => {
        mockRedis.eval
          .mockResolvedValueOnce(['nextCursor123', 2]) // First scan succeeds
          .mockRejectedValueOnce(new Error('Redis error on second scan')); // Second scan fails

        const result = await processor['cleanupZombieMatches']();

        expect(result).toBe(2); // Should return count from the first successful scan
        expect(mockRedis.eval).toHaveBeenCalledTimes(2);
      });

      it('should return 0 if the first Redis eval call fails', async () => {
        mockRedis.eval.mockRejectedValue(
          new Error('Redis error on first scan'),
        );

        const result = await processor['cleanupZombieMatches']();
        expect(result).toBe(0);
        expect(mockRedis.eval).toHaveBeenCalledTimes(1);
      });
    });

    describe('cleanupStaleUsersInQueue', () => {
      const queueKey = 'waiting_queue';
      const defaultMaxWaitTime = 900; // Default from options (15 minutes)

      beforeEach(() => {
        vi.spyOn(Date, 'now').mockReturnValue(1700000000 * 1000);
        mockRedis.zremrangebyscore = vi.fn().mockResolvedValue(0);
      });

      it('should not run if maxUserWaitTimeInQueueSeconds is not set or zero', async () => {
        processor['options'].maxUserWaitTimeInQueueSeconds = 0;
        const result = await processor['cleanupStaleUsersInQueue']();
        expect(result).toBe(0);
        expect(mockRedis.zremrangebyscore).not.toHaveBeenCalled();
        // Reset for other tests
        processor['options'].maxUserWaitTimeInQueueSeconds = defaultMaxWaitTime;
      });

      it('should call zremrangebyscore with correct parameters', async () => {
        const currentTime = 1700000000;
        const maxWait = processor['options'].maxUserWaitTimeInQueueSeconds ?? 0;
        const oldestAllowedTimestamp = currentTime - maxWait;
        mockRedis.zremrangebyscore.mockResolvedValue(5); // Simulate 5 users removed

        const result = await processor['cleanupStaleUsersInQueue']();

        expect(result).toBe(5);
        expect(mockRedis.zremrangebyscore).toHaveBeenCalledWith(
          queueKey,
          0,
          oldestAllowedTimestamp,
        );
      });

      it('should log removed count if users were cleaned up', async () => {
        const loggerSpy = vi.spyOn(logger, 'info');
        mockRedis.zremrangebyscore.mockResolvedValue(3);
        await processor['cleanupStaleUsersInQueue']();
        expect(loggerSpy).toHaveBeenCalledWith(
          expect.objectContaining({ removedCount: 3 }),
          '[MatchmakingProcessor.cleanupStaleUsersInQueue] Cleaned up stale users from waiting queue',
        );
      });

      it('should return 0 and log error if Redis command fails', async () => {
        const loggerSpy = vi.spyOn(logger, 'error');
        mockRedis.zremrangebyscore.mockRejectedValue(new Error('Redis error'));
        const result = await processor['cleanupStaleUsersInQueue']();
        expect(result).toBe(0);
        expect(loggerSpy).toHaveBeenCalledWith(
          expect.objectContaining({ error: expect.any(Error) }),
          '[MatchmakingProcessor.cleanupStaleUsersInQueue] Failed to clean up stale users from queue',
        );
      });
    });

    describe('cleanupOrphanedLocks', () => {
      beforeEach(() => {
        // Force random to be < 0.05 to ensure cleanup runs
        vi.spyOn(Math, 'random').mockReturnValue(0.01);
      });

      it('should check all segment locks', async () => {
        await processor['cleanupOrphanedLocks']();
        // segmentCount is 4 in default test setup for processor
        expect(mockRedis.exists).toHaveBeenCalledTimes(4);
        for (let i = 0; i < 4; i++) {
          expect(mockRedis.exists).toHaveBeenCalledWith(
            `matchmaking_processor:segment:${i}:lock`,
          );
        }
      });

      it('should clean up locks with negative or very low TTL', async () => {
        mockRedis.exists = vi
          .fn()
          .mockResolvedValueOnce(1) // Seg 0 exists
          .mockResolvedValueOnce(1) // Seg 1 exists
          .mockResolvedValueOnce(0) // Seg 2 not exists
          .mockResolvedValueOnce(1); // Seg 3 exists
        mockRedis.pttl = vi
          .fn()
          .mockResolvedValueOnce(-1) // Seg 0 expired
          .mockResolvedValueOnce(50) // Seg 1 low TTL (threshold is lockDuration / 10 = 100ms)
          .mockResolvedValueOnce(1000); // Seg 3 healthy TTL

        const result = await processor['cleanupOrphanedLocks']();
        expect(result).toBe(2); // Seg 0 and Seg 1 cleaned
        expect(mockRedis.del).toHaveBeenCalledTimes(2);
        expect(mockRedis.del).toHaveBeenCalledWith(
          'matchmaking_processor:segment:0:lock',
        );
        expect(mockRedis.del).toHaveBeenCalledWith(
          'matchmaking_processor:segment:1:lock',
        );
      });

      it('should not run if Math.random is above threshold', async () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.1); // > 0.05
        await processor['cleanupOrphanedLocks']();
        expect(mockRedis.exists).not.toHaveBeenCalled();
      });

      it('should handle Redis errors gracefully during orphaned lock cleanup', async () => {
        mockRedis.exists.mockRejectedValue(new Error('Redis error'));
        const result = await processor['cleanupOrphanedLocks']();
        expect(result).toBe(0);
      });
    });
  });

  describe('IX. Statistics', () => {
    it('getStats: should return a copy of the current stats', () => {
      processor['stats'] = {
        processedCount: 10,
        successCount: 8,
        errorCount: 2,
        lastProcessingTimeMs: 150,
        queueSize: 5,
      };
      const stats = processor.getStats();
      expect(stats).toEqual(processor['stats']);
      expect(stats).not.toBe(processor['stats']); // Ensure it's a copy
    });
  });
});
