import type { MatchmakingConfig } from '../model/MatchmakingConfig.js';
import type { QueueUser } from '../model/QueueUser.js';
import type { RedisQueueItem } from '../model/RedisQueueItem.js';
import { MatchmakingQueueService } from './MatchmakingQueueService.js';

/**
 * Fetches a batch of users from the Redis queue with priority sorting
 */
const fetchQueueBatch = async (
  config: MatchmakingConfig,
): Promise<QueueUser[]> => {
  const queueItems = await MatchmakingQueueService.getMultipleFromQueue(
    0,
    config.batchSize,
  );

  return queueItems.map((item: RedisQueueItem) => {
    const { socketId, userId } = MatchmakingQueueService.splitRedisKey(
      item.key,
    );

    return {
      socketId,
      userId,
      score: item.score,
    };
  });
};

export const QueueOperations = {
  fetchQueueBatch,
};
