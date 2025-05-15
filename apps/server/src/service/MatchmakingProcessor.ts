import { Redis } from 'ioredis';
import { Server } from 'socket.io';
import { isDefined } from '@mono/common-util';
import { logger } from '../utils/logger.js';
import { redisClient } from '../clients/redis.js';
import type { MatchmakingProcessorOptions } from '../model/MatchmakingProcessorOptions.js';
import { WaitingQueueService } from './WaitingQueueService.js';
import { IgnoredUsersService } from './IgnoredUsersService.js';

interface MatchQueueItem {
  socketId: string;
  userId: string;
  /** Unix timestamp in seconds */
  joinedAt: number;
}

interface ProcessorStats {
  processedCount: number;
  successCount: number;
  errorCount: number;
  lastProcessingTimeMs: number;
  queueSize: number;
}

interface PotentialMatch {
  user1: MatchQueueItem;
  user2: MatchQueueItem;
  roomId: string;
}

/**
 * Manages user matchmaking using an efficient batch processing approach
 * Designed for multi-instance deployment with Redis-based coordination
 */
export class MatchmakingProcessor {
  // External dependencies
  private io: Server;
  private redis: Redis;
  private waitingQueueService: WaitingQueueService;

  // Configuration
  private options: Required<MatchmakingProcessorOptions>;

  // State
  private isProcessing = false;
  private currentSegment = 0; // Current processing segment index.

  // Timers and Intervals
  private processingInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  // Stats
  private stats: ProcessorStats;

  // Identifiers
  private readonly processorId: string;

  // Caches
  private compatibilityCache = new Map<
    string,
    {
      data: Set<string>;
      /** Unix timestamp in milliseconds */
      expiry: number;
    }
  >();

  /**
   * Constructs a new MatchmakingProcessor instance.
   * @param waitingQueueService Service for managing the user waiting queue.
   * @param io Socket.IO server instance.
   * @param options Optional configuration for the processor.
   */
  constructor(
    waitingQueueService: WaitingQueueService,
    io: Server,
    options: Partial<MatchmakingProcessorOptions> = {},
  ) {
    this.waitingQueueService = waitingQueueService;
    this.io = io;
    this.redis = redisClient;
    this.processorId = `processor:${Math.random().toString(36).substring(2, 15)}`;

    // Set all options with defaults
    this.options = {
      // Core Matching Logic
      interval: options.interval ?? 1000,
      batchSize: options.batchSize ?? 100,
      segmentCount: options.segmentCount ?? 8,
      maxLookAhead: options.maxLookAhead ?? 50,
      minUsersForTieredBucketing: options.minUsersForTieredBucketing ?? 30,
      bucketSizeLimits: options.bucketSizeLimits ?? {
        critical: 200,
        high: 300,
        medium: 400,
        normal: 500,
      },
      luaProcessingBatchSize: options.luaProcessingBatchSize ?? 50,
      maxUserWaitTimeInQueueSeconds:
        options.maxUserWaitTimeInQueueSeconds ?? 900,
      maxWaitTimeScorePoints: options.maxWaitTimeScorePoints ?? 3,
      secondsPerWaitScorePoint: options.secondsPerWaitScorePoint ?? 10,

      // Locking
      lockDuration: options.lockDuration ?? 5000,

      // Data & Cache Management
      matchDataTTL: options.matchDataTTL ?? 3600,
      compabilityCacheTtlMS: options.compabilityCacheTtlMS ?? 300_000,

      // Cleanup Tasks
      cleanupInterval: options.cleanupInterval ?? 60_000,
      hscanCountForCleanup: options.hscanCountForCleanup ?? 50,
    };

    // Initialize stats
    this.stats = {
      processedCount: 0,
      successCount: 0,
      errorCount: 0,
      lastProcessingTimeMs: 0,
      queueSize: 0,
    };
  }

  /**
   * Start the matchmaking processor
   */
  start(): void {
    if (this.processingInterval) {
      logger.warn('[MatchmakingProcessor.start] Already running');
      return;
    }

    logger.info(
      {
        processorId: this.processorId,
        interval: this.options.interval,
        batchSize: this.options.batchSize,
      },
      '[MatchmakingProcessor.start] Starting matchmaking processor',
    );

    void this.startPeriodicCleanup();

    this.processingInterval = setInterval(() => {
      void this.processMatches();
    }, this.options.interval);
  }

  /**
   * Stop the matchmaking processor
   */
  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;

      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = null;
      }
      logger.info(
        { processorId: this.processorId },
        '[MatchmakingProcessor.stop] Stopped matchmaking processor',
      );
    }
  }

  /**
   * Retrieves the current statistics of the matchmaking processor.
   * @returns A copy of the current processor stats.
   */
  getStats(): ProcessorStats {
    return { ...this.stats };
  }

  /**
   * Core method for processing matches.
   * It acquires a lock, fetches users from the queue, finds pairs, and processes them.
   */
  private async processMatches(): Promise<void> {
    if (this.isProcessing) return;

    // Try to acquire a lock for processing the current segment
    const lockAcquired = await this.acquireProcessingLockWithBackoff(3);

    if (!lockAcquired) {
      // Rotate to next segment for next processing cycle
      this.rotateSegment();
      return;
    }

    // Set up lock watchdog to extend the lock during long operations
    let lockWatchdog: NodeJS.Timeout | null = null;

    // Function to extend the lock periodically
    const setupLockWatchdog = () => {
      // Refresh lock at half of the lock duration
      const refreshInterval = Math.floor(this.options.lockDuration / 2);
      const lockKeyForWatchdog = this.processorLockKey; // Capture the lock key

      lockWatchdog = setInterval(async () => {
        try {
          // Extend the lock
          await this.redis.pexpire(
            lockKeyForWatchdog,
            this.options.lockDuration,
          );

          logger.debug(
            { processorId: this.processorId, segment: this.currentSegment },
            '[MatchmakingProcessor.lockWatchdog] Lock extended during processing',
          );
        } catch (error) {
          logger.warn(
            { error, processorId: this.processorId },
            '[MatchmakingProcessor.lockWatchdog] Failed to extend lock',
          );
        }
      }, refreshInterval);
    };

    try {
      this.isProcessing = true;
      setupLockWatchdog();
      const startTime = Date.now();

      // Get total queue size for dynamic segment allocation
      const totalQueueSize = await this.waitingQueueService.getQueueCount();
      this.stats.queueSize = totalQueueSize;

      if (totalQueueSize < 2) {
        this.rotateSegment();
        return;
      }

      // Get adaptive segmentation strategy
      const strategy = this.getSegmentationStrategy(totalQueueSize);

      // Calculate segment size based on adaptive strategy
      const effectiveSegmentCount = strategy.useSegments
        ? strategy.segmentCount
        : 1;
      const optimalSegmentSize = Math.max(
        Math.min(
          Math.ceil(totalQueueSize / effectiveSegmentCount),
          this.options.batchSize,
        ),
        10, // TODO: Magic number: minimum segment size
      );

      // Get users waiting for matches in this dynamic segment
      const segmentSize = strategy.checkWholeThing
        ? totalQueueSize <= this.options.batchSize
          ? totalQueueSize
          : this.options.batchSize
        : optimalSegmentSize;

      const forceStartSegment = strategy.checkWholeThing ? 0 : undefined;
      const queueItems = await this.getQueueMultiSegments(
        1,
        segmentSize,
        forceStartSegment,
      );

      if (!queueItems[0] || queueItems[0].length < 2) {
        // Rotate segment and return early if not enough users
        this.rotateSegment();
        return;
      }

      const waitingUsers = queueItems[0] || []; // Get first segment results

      logger.debug(
        {
          userCount: waitingUsers.length,
          processorId: this.processorId,
          segment: this.currentSegment,
          segmentSize: optimalSegmentSize,
          totalQueue: totalQueueSize,
        },
        '[MatchmakingProcessor.processMatches] Processing matchmaking segment',
      );

      // Use cached ignored users data
      const ignoreMap = await this.preloadCompatibilityData(waitingUsers);

      const nowMs = Date.now();
      const nowSec = nowMs / 1000;

      const pairs = this.findOptimalPairs(waitingUsers, ignoreMap, nowSec);

      logger.debug(
        { pairsFound: pairs.length, processorId: this.processorId },
        '[MatchmakingProcessor.processMatches] Pairs found before processing',
      );

      // Process all matches in optimized batches
      const { successful, failed } = await this.processBatchMatches(pairs);

      // Update stats
      this.stats.processedCount += (successful + failed) * 2;
      this.stats.successCount += successful * 2;
      this.stats.errorCount += failed * 2;
      this.stats.lastProcessingTimeMs = Date.now() - startTime;

      if (successful > 0) {
        logger.debug(
          {
            processorId: this.processorId,
            segment: this.currentSegment,
            matchesCreated: successful,
            matchesFailed: failed,
            timeMs: this.stats.lastProcessingTimeMs,
            segmentSize: optimalSegmentSize,
          },
          '[MatchmakingProcessor.processMatches] Matchmaking completed',
        );
      }

      // Rotate to next segment
      this.rotateSegment();
    } catch (error) {
      logger.error(
        {
          error,
          processorId: this.processorId,
          segment: this.currentSegment,
        },
        '[MatchmakingProcessor.processMatches] Error in matchmaking processor',
      );
    } finally {
      if (lockWatchdog) {
        clearInterval(lockWatchdog);
      }

      this.isProcessing = false;
      await this.releaseProcessingLockForSegment();
    }
  }

  /**
   * Determines the segmentation strategy based on the current queue size.
   * @param queueSize The total number of users in the waiting queue.
   * @returns An object defining the segmentation approach.
   */
  private getSegmentationStrategy(queueSize: number): {
    useSegments: boolean;
    segmentCount: number;
    checkWholeThing: boolean;
  } {
    // TODO: Queue size constants
    // When queue is small, don't bother with segments
    if (queueSize < 30) {
      return {
        useSegments: false,
        segmentCount: 1,
        checkWholeThing: true,
      };
    }

    // For medium queues, use fewer segments
    if (queueSize < 200) {
      return {
        useSegments: true,
        segmentCount: 4, // TODO: Constant
        checkWholeThing: false,
      };
    }

    // For large queues, use full segmentation
    return {
      useSegments: true,
      segmentCount: this.options.segmentCount, // TODO: Constant, not an option
      checkWholeThing: false,
    };
  }

  /**
   * Fetches multiple queue segments from Redis in a single batched operation.
   * @param segmentsToFetch Number of segments to retrieve.
   * @param segmentSize The size of each segment.
   * @param forceStartSegment Optional: Specific segment index to start fetching from.
   * @returns A promise that resolves to an array of MatchQueueItem arrays, one for each segment.
   */
  private async getQueueMultiSegments(
    segmentsToFetch: number,
    segmentSize: number,
    forceStartSegment?: number,
  ): Promise<MatchQueueItem[][]> {
    // Create a pipeline to batch all segment requests into one round trip
    const pipeline = this.redis.pipeline();
    // Use forced segment if provided, otherwise use current segment
    const startingSegment = isDefined(forceStartSegment)
      ? forceStartSegment
      : this.currentSegment;

    // Queue up requests for multiple segments
    for (let i = 0; i < segmentsToFetch; i++) {
      const segmentIndex = (startingSegment + i) % this.options.segmentCount;
      const start = segmentIndex * segmentSize;
      const end = start + segmentSize - 1;

      pipeline.zrange(
        this.waitingQueueService.queueKey,
        start,
        end,
        'WITHSCORES',
      );
    }

    // Execute pipeline as a single Redis round trip
    const results = await pipeline.exec();
    if (!results) {
      return Array(segmentsToFetch).fill([]);
    }

    // Process results for each segment
    const processedResults = results.map(([err, result], index) => {
      if (err || !Array.isArray(result)) return [];

      const segmentIndex =
        (startingSegment + index) % this.options.segmentCount;

      // Parse results into MatchQueueItems
      const items: MatchQueueItem[] = [];
      for (let i = 0; i < result.length; i += 2) {
        const key = result[i];
        const scoreFromRedisString = result[i + 1];
        const score = parseFloat(scoreFromRedisString); // Score is joinedAt (Unix timestamp in seconds)

        logger.debug(
          { key, scoreFromRedisString, parsedScore: score },
          '[MatchmakingProcessor.getQueueMultiSegments] User score from Redis',
        );

        // Transform to easier to work with format
        const { socketId, userId } =
          this.waitingQueueService.splitRedisKey(key);

        items.push({
          socketId,
          userId,
          joinedAt: score,
        });
      }

      logger.debug(
        {
          segmentIndex,
          itemCount: items.length,
          processorId: this.processorId,
        },
        '[MatchmakingProcessor.getQueueMultiSegments] Fetched segment in batch',
      );

      return items;
    });

    return processedResults;
  }

  /**
   * Preloads compatibility data (e.g., ignored user relationships) for a list of users.
   * Utilizes a cache to avoid redundant fetches.
   * @param items An array of MatchQueueItems for which to preload data.
   * @returns A promise that resolves to a map where keys are user IDs and values are sets of ignored user IDs.
   */
  private async preloadCompatibilityData(
    items: MatchQueueItem[],
  ): Promise<Map<string, Set<string>>> {
    // Create result map for ignored users
    const ignoreMap = new Map<string, Set<string>>();
    if (!items.length) return ignoreMap;

    const userIds = items.map((item) => item.userId);
    const now = Date.now();

    // Check which users need their data refreshed
    const usersToFetch: string[] = [];

    // Filter out users with valid cache
    userIds.forEach((userId) => {
      const cachedData = this.compatibilityCache.get(userId);
      if (!cachedData || cachedData.expiry < now) {
        // Cache miss or expired
        usersToFetch.push(userId);
      } else {
        // Use cached data directly
        ignoreMap.set(userId, new Set(cachedData.data)); // Create new Set to avoid mutation
      }
    });

    // Fetch ignored pairs from service
    if (usersToFetch.length > 0) {
      const ignoredPairs =
        await IgnoredUsersService.getIgnoredPairsForUsers(usersToFetch);

      // Process the ignored pairs
      for (const [userId, ignoredId] of ignoredPairs) {
        if (!ignoreMap.has(userId)) {
          ignoreMap.set(userId, new Set());
        }
        ignoreMap.get(userId)?.add(ignoredId);

        // Update cache with fresh data (completely replacing old data)
        this.compatibilityCache.set(userId, {
          data: new Set(ignoreMap.get(userId)), // Create a copy to avoid mutation
          expiry: now + this.options.compabilityCacheTtlMS,
        });
      }
    }

    return ignoreMap;
  }

  /**
   * Finds optimal pairs among a list of users based on wait time and compatibility.
   * @param items Array of users in the queue.
   * @param ignoreMap Map of users to their ignored user IDs.
   * @param currentTime Current Redis time in seconds.
   * @returns An array of matched pairs.
   */
  private findOptimalPairs(
    items: MatchQueueItem[],
    ignoreMap: Map<string, Set<string>>,
    currentTime: number, // Unix timestamp in seconds
  ): [MatchQueueItem, MatchQueueItem][] {
    const pairs: [MatchQueueItem, MatchQueueItem][] = [];
    const usedIds = new Set<string>();

    // Group users by wait time buckets (tiered priority)
    const waitTimeBuckets: Record<string, MatchQueueItem[]> = {
      critical: [], // Waited > 120 seconds
      high: [], // Waited 30-120 seconds
      medium: [], // Waited 10-30 seconds
      normal: [], // Waited < 10 seconds
    };

    // If the number of items is below the threshold (and >=2), process them all together
    // without coarse-grained bucketing. This helps match small numbers of users quickly.
    if (
      items.length >= 2 &&
      items.length < this.options.minUsersForTieredBucketing
    ) {
      this.matchUsersInGroup(items, pairs, usedIds, ignoreMap, currentTime);
      return pairs;
    }
    if (items.length < 2) {
      return pairs; // Not enough users to form any pair
    }

    // Partition users into buckets
    for (const user of items) {
      if (usedIds.has(user.socketId)) continue;

      const waitTime = currentTime - user.joinedAt; // waitTime in seconds
      if (
        waitTime > 120 && // 2 minutes
        waitTimeBuckets.critical.length < this.options.bucketSizeLimits.critical
      ) {
        waitTimeBuckets.critical.push(user);
      } else if (
        waitTime > 30 && // 30 seconds
        waitTimeBuckets.high.length < this.options.bucketSizeLimits.high
      ) {
        waitTimeBuckets.high.push(user);
      } else if (
        waitTime > 10 && // 10 seconds
        waitTimeBuckets.medium.length < this.options.bucketSizeLimits.medium
      ) {
        waitTimeBuckets.medium.push(user);
      } else if (
        waitTimeBuckets.normal.length < this.options.bucketSizeLimits.normal
      ) {
        waitTimeBuckets.normal.push(user);
      }
    }

    // Process each bucket, prioritizing users who have waited longer
    const bucketOrder = ['critical', 'high', 'medium', 'normal'];

    for (const bucketName of bucketOrder) {
      const bucket = waitTimeBuckets[bucketName];

      // Process users in this bucket directly - no region filtering
      this.matchUsersInGroup(bucket, pairs, usedIds, ignoreMap, currentTime);
    }

    return pairs;
  }

  /**
   * Matches users within a specific group, considering wait times and compatibility.
   * @param users Array of users within a group.
   * @param pairs Array to store the resulting matched pairs.
   * @param usedIds Set of user IDs that have already been matched.
   * @param ignoreMap Map of users to their ignored user IDs.
   * @param currentTime Current Redis time in seconds.
   */
  private matchUsersInGroup(
    users: MatchQueueItem[],
    pairs: [MatchQueueItem, MatchQueueItem][],
    usedIds: Set<string>,
    ignoreMap: Map<string, Set<string>>,
    currentTime: number, // Unix timestamp in seconds
  ): void {
    // Skip if too few users
    if (users.length < 2) return;

    // Sort by joining time (oldest first)
    const sortedUsers = [...users].sort((a, b) => a.joinedAt - b.joinedAt);

    // Create wait time buckets (spatial partitioning by wait time)
    // Group users into 5-second granularity buckets
    const waitTimeBuckets = new Map<number, MatchQueueItem[]>();

    for (const user of sortedUsers) {
      if (usedIds.has(user.socketId)) continue;

      // Get wait time in seconds and round to nearest 5 seconds
      const waitTime = Math.floor((currentTime - user.joinedAt) / 5) * 5; // waitTime in seconds, bucketed

      if (!waitTimeBuckets.has(waitTime)) {
        waitTimeBuckets.set(waitTime, []);
      }
      waitTimeBuckets.get(waitTime)?.push(user);
    }

    // Sort bucket keys (wait times) in descending order
    const orderedWaitTimes = Array.from(waitTimeBuckets.keys()).sort(
      (a, b) => b - a,
    );

    // Match within each wait time bucket first, then try adjacent buckets
    for (const waitTime of orderedWaitTimes) {
      const bucketUsers = waitTimeBuckets.get(waitTime);
      if (!bucketUsers) continue;

      for (let i = 0; i < bucketUsers.length; i++) {
        const user1 = bucketUsers[i];
        if (usedIds.has(user1.socketId)) continue;

        let bestMatch: MatchQueueItem | null = null;
        let bestScore = -1;

        // First try to match within the same bucket
        const lookAheadLimit = Math.min(
          bucketUsers.length,
          i + 1 + this.options.maxLookAhead,
        );

        for (let j = i + 1; j < lookAheadLimit; j++) {
          const user2 = bucketUsers[j];
          if (usedIds.has(user2.socketId)) continue;

          const score = this.calculateCompatibilityScore(
            user1,
            user2,
            ignoreMap,
            currentTime,
          );
          logger.debug(
            { user1Id: user1.userId, user2Id: user2.userId, score },
            '[MatchmakingProcessor.matchUsersInGroup] Compatibility score calculated',
          );
          if (score > bestScore) {
            bestMatch = user2;
            bestScore = score;
          }
        }

        // If no match found in same bucket, check adjacent buckets
        if (!bestMatch) {
          // Check adjacent buckets (±5, ±10 seconds)
          const adjacentTimes = [
            waitTime - 5,
            waitTime + 5,
            waitTime - 10,
            waitTime + 10,
          ];

          for (const adjTime of adjacentTimes) {
            const adjBucket = waitTimeBuckets.get(adjTime);
            if (!adjBucket) continue;

            // Apply maxLookAhead to adjacent bucket search for performance at scale
            const adjLookAheadLimit = Math.min(
              adjBucket.length,
              this.options.maxLookAhead,
            );
            for (let k = 0; k < adjLookAheadLimit; k++) {
              const user2 = adjBucket[k];
              // Ensure user1 is not being compared with itself (shouldn't happen if adjTime != waitTime)
              // and user2 is not already used.
              if (
                user1.socketId === user2.socketId ||
                usedIds.has(user2.socketId)
              )
                continue;

              const score = this.calculateCompatibilityScore(
                user1,
                user2,
                ignoreMap,
                currentTime,
              );
              if (score > bestScore) {
                bestMatch = user2;
                bestScore = score;
              }
            }
            // Optimization: If a good match is found in a "closer" adjacent bucket,
            // one might consider breaking early, but this makes it more heuristic.
            // Current logic finds the best among the limited search in all specified adjacent buckets.
          }
        }

        if (bestMatch && bestScore > 0) {
          usedIds.add(user1.socketId);
          usedIds.add(bestMatch.socketId);
          pairs.push([user1, bestMatch]);
        }
      }
    }
  }

  /**
   * Calculates a compatibility score between two users.
   * Considers ignored status and waiting time.
   * @param user1 The first user.
   * @param user2 The second user.
   * @param ignoreMap Map of users to their ignored user IDs.
   * @param currentTime Current Redis time in seconds.
   * @returns A numerical compatibility score.
   */
  private calculateCompatibilityScore(
    user1: MatchQueueItem,
    user2: MatchQueueItem,
    ignoreMap: Map<string, Set<string>>,
    currentTime: number, // Unix timestamp in seconds
  ): number {
    logger.debug(
      {
        user1JoinedAt: user1.joinedAt,
        user2JoinedAt: user2.joinedAt,
        currentTimeForCalc: currentTime,
      },
      '[MatchmakingProcessor.calculateCompatibilityScore] Input timestamps',
    );
    // Check if users have ignored each other using the preloaded data
    const hasIgnored =
      ignoreMap.get(user1.userId)?.has(user2.userId) ||
      ignoreMap.get(user2.userId)?.has(user1.userId);

    if (hasIgnored) return 0;

    // Now both timestamps are in seconds
    const user1WaitTime = currentTime - user1.joinedAt; // In seconds
    const user2WaitTime = currentTime - user2.joinedAt; // In seconds

    // Adjust divisor since we're now working with seconds instead of milliseconds
    // Original: 10000 milliseconds (10 seconds) = 1 point
    // New: 10 seconds = 1 point
    const waitingTimeFactor =
      Math.min(
        user1WaitTime / this.options.secondsPerWaitScorePoint,
        this.options.maxWaitTimeScorePoints,
      ) +
      Math.min(
        user2WaitTime / this.options.secondsPerWaitScorePoint,
        this.options.maxWaitTimeScorePoints,
      );

    return waitingTimeFactor;
  }

  /**
   * Processes a batch of potential matches using a Lua script for atomic Redis operations.
   * @param pairs An array of potential user pairs.
   * @returns A promise that resolves to an object containing counts of successful and failed matches.
   */
  private async processBatchMatches(
    pairs: [MatchQueueItem, MatchQueueItem][],
  ): Promise<{ successful: number; failed: number }> {
    if (pairs.length === 0) return { successful: 0, failed: 0 };

    let totalSuccessfulPairs = 0;
    let totalFailedPairs = 0;

    // Process in smaller batches for better Redis performance
    const luaBatchSize = this.options.luaProcessingBatchSize;
    const batches = Math.ceil(pairs.length / luaBatchSize);

    for (let i = 0; i < batches; i++) {
      const batchPairs = pairs.slice(i * luaBatchSize, (i + 1) * luaBatchSize);

      try {
        logger.debug(
          {
            batchIndex: i,
            pairsCount: batchPairs.length,
            pairs: batchPairs.map(([u1, u2]) => ({
              u1: { id: u1.userId, socketId: u1.socketId },
              u2: { id: u2.userId, socketId: u2.socketId },
            })),
          },
          '[MatchmakingProcessor.processBatchMatches] Processing match batch',
        );
        // 1. Check availability of all users in this batch
        const availabilityResults =
          await this.checkBatchAvailability(batchPairs);

        if (!availabilityResults) continue;

        // 2. Prepare potential matches based on availability results
        const potentialMatches = this.preparePotentialMatches(
          batchPairs,
          availabilityResults,
        );

        // 3. Execute atomic match creation with Lua script
        let notifiedSuccessfullyThisBatch = 0;
        if (potentialMatches.length > 0) {
          const successfulMatchesFromLua =
            await this.createMatchesWithLua(potentialMatches);

          // 4. Send notifications for successfully created matches
          // Note: We only notify for matches that were confirmed created by the Lua script
          notifiedSuccessfullyThisBatch = this.emitMatchFound(
            successfulMatchesFromLua,
            potentialMatches,
          );
        }

        totalSuccessfulPairs += notifiedSuccessfullyThisBatch;
        totalFailedPairs += batchPairs.length - notifiedSuccessfullyThisBatch;
      } catch (error) {
        totalFailedPairs += batchPairs.length; // All pairs in this batch failed due to the error
        logger.error(
          { error, batchIndex: i, processorId: this.processorId },
          '[MatchmakingProcessor.processBatchMatches] Failed to process match batch',
        );
      }
    }

    return { successful: totalSuccessfulPairs, failed: totalFailedPairs };
  }

  private async checkBatchAvailability(
    batchPairs: [MatchQueueItem, MatchQueueItem][],
  ) {
    const availabilityPipeline = this.redis.pipeline();

    for (const [user1, user2] of batchPairs) {
      // Query user1 status
      availabilityPipeline.zscore(
        this.waitingQueueService.queueKey,
        this.waitingQueueService.composeKey({
          socketId: user1.socketId,
          userId: user1.userId,
        }),
      );
      availabilityPipeline.hexists(
        this.waitingQueueService.matchAssignmentsKey,
        user1.socketId,
      );

      // Query user2 status
      availabilityPipeline.zscore(
        this.waitingQueueService.queueKey,
        this.waitingQueueService.composeKey({
          socketId: user2.socketId,
          userId: user2.userId,
        }),
      );
      availabilityPipeline.hexists(
        this.waitingQueueService.matchAssignmentsKey,
        user2.socketId,
      );
    }

    return await availabilityPipeline.exec();
  }

  private preparePotentialMatches(
    batchPairs: [MatchQueueItem, MatchQueueItem][],
    availabilityResults: [error: Error | null, result: unknown][],
  ) {
    const potentialMatches: PotentialMatch[] = [];

    for (let j = 0; j < batchPairs.length; j++) {
      const [user1, user2] = batchPairs[j];
      const baseIndex = j * 4; // 4 results per pair

      // Check availability results
      const user1InQueue = availabilityResults[baseIndex][1] !== null;
      const user1HasNoMatch = !availabilityResults[baseIndex + 1][1];
      const user2InQueue = availabilityResults[baseIndex + 2][1] !== null;
      const user2HasNoMatch = !availabilityResults[baseIndex + 3][1];

      if (user1InQueue && user1HasNoMatch && user2InQueue && user2HasNoMatch) {
        // Generate room ID
        const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        // Add to potential matches
        potentialMatches.push({ user1, user2, roomId });
      }
    }

    return potentialMatches;
  }

  private emitMatchFound(
    successfulMatchesFromLua: number,
    potentialMatches: PotentialMatch[],
  ) {
    let notifiedSuccessfullyThisBatch = 0;

    for (let j = 0; j < successfulMatchesFromLua; j++) {
      // Assuming potentialMatches are ordered and Lua returns count for the head of that list
      const { user1, user2, roomId } = potentialMatches[j];

      try {
        // Notify user1
        this.io
          .of('/video-chat')
          .to(user1.socketId)
          .emit('match-found', roomId, user2.socketId, user2.userId, true);

        // Notify user2
        this.io
          .of('/video-chat')
          .to(user2.socketId)
          .emit('match-found', roomId, user1.socketId, user1.userId, false);

        logger.debug(
          { roomId, user1Id: user1.userId, user2Id: user2.userId },
          '[MatchmakingProcessor.emitMatchFound] Matched users notified',
        );

        notifiedSuccessfullyThisBatch++;
      } catch (error) {
        // Failed to notify for a match Lua said was created. This pair is effectively failed.
        logger.error(
          { error, roomId, user1Id: user1.userId, user2Id: user2.userId },
          '[MatchmakingProcessor.emitMatchFound] Failed to notify users about match',
        );
      }
    }

    return notifiedSuccessfullyThisBatch;
  }

  /**
   * Creates matches in Redis using a Lua script for atomicity.
   * This script checks user availability, creates match assignments, and removes users from the queue.
   * @param matches An array of match objects to be created.
   * @returns A promise that resolves to the number of successfully created matches.
   */
  private async createMatchesWithLua(
    matches: {
      user1: MatchQueueItem;
      user2: MatchQueueItem;
      roomId: string;
    }[],
  ): Promise<number> {
    if (matches.length === 0) return 0;

    const keys = [
      this.waitingQueueService.queueKey,
      this.waitingQueueService.matchAssignmentsKey,
    ];

    const script = `
    local queueKey = KEYS[1]
    local matchKey = KEYS[2]
    local matchDataTTL = tonumber(ARGV[1]) -- TTL in seconds
    local delimiter = ARGV[2]
    local successful = 0
    
    for i = 3, #ARGV, 5 do
      local user1Socket = ARGV[i]
      local user1Id = ARGV[i+1]
      local user2Socket = ARGV[i+2]
      local user2Id = ARGV[i+3]
      local roomId = ARGV[i+4]
      
      -- Compose Redis keys for each user
      local user1Key = user1Socket .. delimiter .. user1Id
      local user2Key = user2Socket .. delimiter .. user2Id
      
      -- Log for debugging
      redis.log(redis.LOG_NOTICE, "Looking up users: " .. user1Key .. " and " .. user2Key)
      
      -- Check if users are in queue
      local user1InQueue = redis.call("ZSCORE", queueKey, user1Key) ~= false
      local user2InQueue = redis.call("ZSCORE", queueKey, user2Key) ~= false
      
      -- Check if users already have a match
      local user1HasMatch = redis.call("HEXISTS", matchKey, user1Socket)
      local user2HasMatch = redis.call("HEXISTS", matchKey, user2Socket)
      
      -- Only create match if both users are available
      if user1InQueue and user1HasMatch == 0 and user2InQueue and user2HasMatch == 0 then
        -- Create match assignments
        redis.call('HSET', matchKey, user1Socket, 
          string.format('{"roomId":"%s","partnerSocketId":"%s"}', roomId, user2Socket))
        redis.call('HSET', matchKey, user2Socket, 
          string.format('{"roomId":"%s","partnerSocketId":"%s"}', roomId, user1Socket))
        
        -- Set TTL on the entire hash if not already set
        redis.call('EXPIRE', matchKey, matchDataTTL)
        
        -- Remove users from queue
        redis.call('ZREM', queueKey, user1Key)
        redis.call('ZREM', queueKey, user2Key)
        
        redis.log(redis.LOG_NOTICE, "Match created between: " .. user1Key .. " and " .. user2Key)
        successful = successful + 1
      else
        redis.log(redis.LOG_WARNING, "Match failed: " .. 
          "user1InQueue=" .. tostring(user1InQueue) .. 
          ", user1HasMatch=" .. tostring(user1HasMatch) .. 
          ", user2InQueue=" .. tostring(user2InQueue) .. 
          ", user2HasMatch=" .. tostring(user2HasMatch))
      end
    end
    
    return successful
  `;

    try {
      const args = [
        this.options.matchDataTTL.toString(),
        this.waitingQueueService.delimiter,
        ...matches.flatMap((match) => [
          match.user1.socketId,
          match.user1.userId,
          match.user2.socketId,
          match.user2.userId,
          match.roomId,
        ]),
      ];

      const successfulMatches = await this.redis.eval(
        script,
        keys.length,
        ...keys,
        ...args,
      );

      const successfulMatchesFromLua =
        parseInt(successfulMatches as string) || 0;

      logger.debug(
        { successfulMatches: successfulMatchesFromLua },
        '[MatchmakingProcessor.createMatchesWithLua] Lua script execution result',
      );

      return successfulMatchesFromLua;
    } catch (error) {
      logger.error(
        { error },
        '[MatchmakingProcessor.createMatchesWithLua] Failed to create matches with Lua script',
      );
      return 0;
    }
  }

  // --- Locking Utilities ---

  private get processorLockKey(): string {
    return `matchmaking_processor:segment:${this.currentSegment}:lock`;
  }

  /**
   * Attempts to acquire a processing lock for the current segment with exponential backoff.
   * @param maxAttempts Maximum number of attempts to acquire the lock.
   * @returns True if the lock was acquired, false otherwise.
   */
  private async acquireProcessingLockWithBackoff(
    maxAttempts = 3,
  ): Promise<boolean> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const acquired = await this.acquireProcessingLockForSegment();
      if (acquired) return true;

      if (attempt < maxAttempts - 1) {
        // Wait with exponential backoff (50ms, 100ms, 200ms...)
        await new Promise((r) => setTimeout(r, 50 * Math.pow(2, attempt)));
      }
    }
    return false;
  }

  /**
   * Acquires a processing lock for the current segment in Redis.
   * Uses a "set if not exists" (NX) operation to ensure atomicity.
   * @returns True if the lock was acquired, false otherwise.
   */
  private async acquireProcessingLockForSegment(): Promise<boolean> {
    const lockExpiryMs = this.options.lockDuration;
    const result = await this.redis.set(
      this.processorLockKey,
      this.processorId,
      'PX',
      lockExpiryMs,
      'NX',
    );
    return result === 'OK';
  }

  /**
   * Releases the processing lock for the current segment in Redis.
   * Only deletes the lock if it is still held by the current processor instance.
   */
  private async releaseProcessingLockForSegment(): Promise<void> {
    await this.redis.eval(
      `if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end`,
      1,
      this.processorLockKey,
      this.processorId,
    );
  }

  // --- Segment Utilities ---

  /**
   * Rotates to the next processing segment.
   */
  private rotateSegment(): void {
    this.currentSegment = (this.currentSegment + 1) % this.options.segmentCount;
  }

  // --- Periodic Cleanup ---

  /**
   * Starts periodic cleanup tasks for zombie matches, orphaned locks, and stale users.
   */
  private startPeriodicCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(async () => {
      try {
        // Run cleanup and log results
        const zombieCount = await this.cleanupZombieMatches();
        const orphanedCount = await this.cleanupOrphanedLocks();
        const staleUserCount = await this.cleanupStaleUsersInQueue();

        if (zombieCount > 0 || orphanedCount > 0 || staleUserCount > 0) {
          logger.info(
            {
              zombieCount,
              orphanedCount,
              staleUserCount,
              processorId: this.processorId,
            },
            'Periodic cleanup completed',
          );
        }
      } catch (error) {
        logger.error(
          { error, processorId: this.processorId },
          '[MatchmakingProcessor.startPeriodicCleanup] Failed to perform periodic cleanup',
        );
      }
    }, this.options.cleanupInterval);

    logger.debug(
      {
        processorId: this.processorId,
        intervalMs: this.options.cleanupInterval,
      },
      '[MatchmakingProcessor.startPeriodicCleanup] Started periodic cleanup tasks (zombies, orphans, stale users)',
    );
  }

  /**
   * Cleans up "zombie" matches from Redis.
   * A zombie match occurs when one user in a pair has match data but their partner does not.
   * Uses HSCAN to iterate through match assignments efficiently.
   * @returns A promise that resolves to the number of zombie matches cleaned.
   */
  private async cleanupZombieMatches(): Promise<number> {
    let cursor = '0';
    let totalCleanedCount = 0;
    const hscanCount = this.options.hscanCountForCleanup ?? 50;

    try {
      const script = `
        local matchKey = KEYS[1]
        local currentCursor = ARGV[1]
        local count = ARGV[2]
        local cleanedInThisScan = 0

        local scanResult = redis.call('HSCAN', matchKey, currentCursor, 'COUNT', count)
        local nextCursor = scanResult[1]
        local matches = scanResult[2]
        
        if matches then
          for i = 1, #matches, 2 do
            local socketId = matches[i]
            local matchDataJson = matches[i+1]
            local matchData = cjson.decode(matchDataJson)
            
            if matchData and matchData.partnerSocketId then
              if not redis.call("HEXISTS", matchKey, matchData.partnerSocketId) then
                redis.call("HDEL", matchKey, socketId)
                cleanedInThisScan = cleanedInThisScan + 1
              end
            else
              -- Invalid match data, consider it a zombie and remove
              redis.call("HDEL", matchKey, socketId)
              cleanedInThisScan = cleanedInThisScan + 1
            end
          end
        end
        
        return {nextCursor, cleanedInThisScan}
      `;

      do {
        const result = (await this.redis.eval(
          script,
          1, // Number of keys
          this.waitingQueueService.matchAssignmentsKey,
          cursor, // ARGV[1]
          hscanCount.toString(), // ARGV[2]
        )) as [string, number];

        cursor = result[0];
        totalCleanedCount += result[1];
      } while (cursor !== '0');

      return totalCleanedCount;
    } catch (error) {
      logger.error(
        { error, processorId: this.processorId },
        '[MatchmakingProcessor.cleanupZombieMatches] Failed to clean up zombie matches using HSCAN',
      );
      return totalCleanedCount; // Return whatever was cleaned before the error
    }
  }

  /**
   * Cleans up orphaned processor locks from Redis.
   * An orphaned lock is a lock that still exists but its TTL is expired or very short,
   * indicating the processor that held it might have crashed.
   * This runs with a low probability to avoid contention.
   * @returns A promise that resolves to the number of orphaned locks cleaned.
   */
  private async cleanupOrphanedLocks(): Promise<number> {
    if (Math.random() > 0.05) return 0; // Run only ~5% of the time to reduce load

    try {
      let cleanedCount = 0;

      for (let i = 0; i < this.options.segmentCount; i++) {
        const lockKey = `matchmaking_processor:segment:${i}:lock`;

        // Check if lock exists and is old (>2x normal lock duration)
        // TODO: Use redis pipeline?
        const [exists, ttl] = await Promise.all([
          this.redis.exists(lockKey),
          this.redis.pttl(lockKey),
        ]);

        // If lock exists but TTL is negative or very small, it's likely orphaned
        if (exists && (ttl < 0 || ttl < 100)) {
          await this.redis.del(lockKey);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        logger.warn(
          { cleanedCount, processorId: this.processorId },
          '[MatchmakingProcessor.cleanupOrphanedLocks] Removed orphaned processor locks',
        );
      }

      return cleanedCount;
    } catch (error) {
      logger.error(
        { error, processorId: this.processorId },
        '[MatchmakingProcessor.cleanupOrphanedLocks] Failed to cleanup orphaned locks',
      );
      return 0;
    }
  }

  /**
   * Cleans up stale users from the waiting queue.
   * Users are considered stale if they have been in the queue longer than `maxUserWaitTimeInQueueSeconds`.
   * @returns A promise that resolves to the number of stale users removed.
   */
  private async cleanupStaleUsersInQueue(): Promise<number> {
    const maxWaitTime = this.options.maxUserWaitTimeInQueueSeconds;
    if (!maxWaitTime || maxWaitTime <= 0) {
      return 0;
    }

    try {
      const currentTimeInSeconds = Date.now() / 1000;
      const oldestAllowedTimestamp = currentTimeInSeconds - maxWaitTime;

      const removedCount = await this.redis.zremrangebyscore(
        this.waitingQueueService.queueKey,
        0,
        oldestAllowedTimestamp,
      );

      if (removedCount > 0) {
        logger.info(
          {
            removedCount,
            maxWaitTimeSeconds: maxWaitTime,
            processorId: this.processorId,
          },
          '[MatchmakingProcessor.cleanupStaleUsersInQueue] Cleaned up stale users from waiting queue',
        );
      }
      return removedCount;
    } catch (error) {
      logger.error(
        { error, processorId: this.processorId },
        '[MatchmakingProcessor.cleanupStaleUsersInQueue] Failed to clean up stale users from queue',
      );
      return 0;
    }
  }
}
