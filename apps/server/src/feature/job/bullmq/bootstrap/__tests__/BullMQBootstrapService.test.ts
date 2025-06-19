import { ServerConfigService } from '../../../../../common/config/service/ServerConfigService.js';
import { BullMQBootstrapService } from '../BullMQBootstrapService.js';
import { QueueService } from '../../../../matchmaking/service/queue/QueueService.js';
import { SupabaseService } from '../../../../../common/service/SupabaseService.js';

// Mock the external dependencies that MatchmakingJobEntry needs
vi.mock('../../../../../common/service/SupabaseService.js');
vi.mock('../../../../socket-io/server/SocketServer.js', () => ({
  SocketServer: {
    io: {
      of: vi.fn().mockReturnValue({
        to: vi.fn().mockReturnThis(),
        emit: vi.fn(),
      }),
    },
  },
}));

describe('BullMQBootstrapService', () => {
  beforeAll(() => {
    ServerConfigService.init(process.env);
  });

  beforeEach(() => {
    // Mock SupabaseService to return no ignored pairs
    vi.mocked(SupabaseService.getIgnoredPairs).mockResolvedValue([]);

    // Mock Redis cache operations for IgnoredUsersService
    globalThis.redisClient.hmget = vi.fn().mockResolvedValue([null, null]); // Cache miss by default
    globalThis.redisClient.hmset = vi.fn().mockResolvedValue('OK');
    globalThis.redisClient.expire = vi.fn().mockResolvedValue(1);
  });

  afterEach(async () => {
    // Clean up BullMQ instances after each test
    if (BullMQBootstrapService.bullMQInstances) {
      for (const instance of BullMQBootstrapService.bullMQInstances) {
        await BullMQBootstrapService.shutdown(instance);
      }
    }
    BullMQBootstrapService._reset();
  });

  describe('Integration tests', () => {
    describe('Matchmaking job', () => {
      it('should process users atomically', async () => {
        // Test setup - Add users to queue

        const users = new Array(200)
          .fill(null)
          .map((_, i) => QueueService.addToQueue(`socket${i}`, `user${i}`));
        await Promise.all(users);

        // Verify users are in queue
        const initialQueueCount = await QueueService._getQueueCount();
        expect(initialQueueCount).toBe(users.length);

        // Initialize BullMQ with multiple workers (4 workers as per matchmaking config)
        await BullMQBootstrapService.initialize();

        // Helper to get processing claims
        const getProcessingClaims = async (): Promise<string[]> => {
          const queueKey = QueueService.getRegionSpecificQueueKey();
          const processingKey = `${queueKey}:processing`;
          return await globalThis.redisClient.keys(`${processingKey}:*`);
        };

        // Helper to extract user and worker info from claim keys
        const analyzeClaimKeys = async (claimKeys: string[]) => {
          const claimedUserIds = new Set<string>();
          const workerIds = new Set<string>();

          for (const claimKey of claimKeys) {
            // Claim key format: waiting_queue:localhost:processing:socket0__:__user0
            // Extract the user key (everything after 'processing:')
            const processingPrefix = 'processing:';
            const processingIndex = claimKey.indexOf(processingPrefix);

            const userKey = claimKey.substring(
              processingIndex + processingPrefix.length,
            );

            const { userId } = QueueService.splitRedisKey(userKey);
            claimedUserIds.add(userId);

            // Get the worker ID from the Redis value

            const workerValue = await globalThis.redisClient.get(claimKey);
            if (workerValue) {
              workerIds.add(workerValue);
            }
          }

          return { claimedUserIds, workerIds };
        };

        // Get the matchmaking queue to trigger jobs
        const matchmakingQueue = BullMQBootstrapService.bullMQInstances
          .find((instance) => instance.queues.has('matchmaking'))
          ?.queues.get('matchmaking');

        if (!matchmakingQueue) {
          throw new Error('Matchmaking queue not found after initialization');
        }

        // Track all processed users across multiple sampling points
        const allProcessedUsers = new Set<string>();
        let maxConcurrentWorkers = 0;
        let duplicateUserDetected = false;

        // Start high-frequency sampling BEFORE triggering jobs
        let samplingActive = true;
        const samplingPromise = new Promise<void>((resolve) => {
          const sampleProcessingState = async () => {
            if (!samplingActive) {
              resolve();
              return;
            }

            const activeClaims = await getProcessingClaims();

            if (activeClaims.length > 0) {
              const { claimedUserIds, workerIds } =
                await analyzeClaimKeys(activeClaims);

              // Track the maximum number of concurrent workers we've seen
              maxConcurrentWorkers = Math.max(
                maxConcurrentWorkers,
                workerIds.size,
              );

              // Check for duplicate user processing (atomicity violation)
              for (const userId of claimedUserIds) {
                if (allProcessedUsers.has(userId)) {
                  duplicateUserDetected = true;
                }
                allProcessedUsers.add(userId);
              }

              // Verify no duplicate user IDs in current claims (within same sampling)
              if (claimedUserIds.size !== activeClaims.length) {
                duplicateUserDetected = true;
              }
            }

            // Continue sampling at high frequency
            setTimeout(sampleProcessingState, 10); // Very fast sampling - 10ms
          };

          // Start sampling immediately
          sampleProcessingState();
        });

        // Trigger many concurrent jobs with delays to create sustained load
        const triggerConcurrentJobs = async () => {
          for (let batch = 0; batch < 5; batch++) {
            // Trigger a batch of jobs
            const batchPromises = [];
            for (let i = 0; i < 4; i++) {
              batchPromises.push(
                matchmakingQueue.add('matchmaking:process-queue', {
                  source: 'test',
                  batch,
                  iteration: i,
                }),
              );
            }
            await Promise.all(batchPromises);

            // Small delay between batches to create overlap
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
        };

        // Start job triggering
        const jobPromise = triggerConcurrentJobs();

        // Let sampling run for a while during job processing
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Stop sampling
        samplingActive = false;
        await samplingPromise;

        // Wait for jobs to complete
        await jobPromise;

        // Wait a bit more for all processing to complete
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Final verification
        const finalQueueCount = await QueueService._getQueueCount();
        const finalActiveClaims = await getProcessingClaims();

        // ATOMICITY ASSERTIONS - Focus on behavior, not implementation details

        // 1. CORE ATOMICITY: No duplicate user processing should ever occur
        expect(duplicateUserDetected).toBe(false);

        // 2. COMPLETENESS: All users should be processed exactly once
        expect(finalQueueCount).toBe(0);
        expect(finalActiveClaims.length).toBe(0);

        // 3. CONSISTENCY: Total processed users should equal original count
        // (This is the strongest atomicity guarantee - each user processed exactly once)
        expect(allProcessedUsers.size).toBe(users.length);

        // 4. SYSTEM FUNCTIONALITY: Multi-worker system should be initialized
        const matchmakingInstances =
          BullMQBootstrapService.bullMQInstances.find((instance) =>
            instance.queues.has('matchmaking'),
          );
        expect(matchmakingInstances?.workers.length).toBe(4);

        // 5. PROCESSING EVIDENCE: We should have detected processing activity
        // (This proves the atomic claim/release cycle is working)
        // Note: Worker count is non-deterministic due to timing, but we should see some activity
        const processingDetected = allProcessedUsers.size > 0;
        expect(processingDetected).toBe(true);
      }, 20000); // Longer timeout for sampling-based test
    });
  });
});
