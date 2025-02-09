import { v4 as uuid } from 'uuid';
import type { Maybe } from '@mono/common-dto';
import logger from '../utils/logger.js';
import { MODE } from '../model/ServerConstants.js';
import { SupabaseService } from './SupabaseService.js';
import type { WaitingQueueService } from './WaitingQueueService.js';

const handleNoValidMatch = async (
  redisQueue: WaitingQueueService,
  socketId: Maybe<string>,
  userId: Maybe<string>,
) => {
  if (socketId && userId) {
    logger.warn(
      { socketId, userId },
      'Invalid match data, adding user back to queue',
    );
    return await redisQueue.addToQueue(socketId, userId);
  }

  logger.error({ socketId, userId }, 'Invalid find-match parameters');
};

const findMatch = async (
  redisQueue: WaitingQueueService,
  socketId: string,
  userId: string,
  position = 0,
): Promise<
  Maybe<{
    roomId: string;
    partnerSocketId: string;
    partnerUserId: string;
  }>
> => {
  const [match, queueCount] = await Promise.all([
    redisQueue.getFirstInQueue(position),
    redisQueue.getQueueCount(),
  ]);

  // Match with self, add to queue if not already in queue
  if (match?.userId === userId && MODE === 'production') {
    const match = await redisQueue.findByMatchPattern(
      redisQueue.composeKey({ userId, socketId: undefined }),
    );
    if (!match) {
      await redisQueue.addToQueue(socketId, userId);
    }
    return undefined;
  }

  // Queue is empty or no more matches available
  if (queueCount <= 0 || (position > 0 && !match)) {
    await redisQueue.addToQueue(socketId, userId);
    return undefined;
  }

  // Invalid match data
  if (!match?.userId || !match?.socketId || !socketId || !userId) {
    await handleNoValidMatch(redisQueue, socketId, userId);
    return undefined;
  }

  const partnersCanMatch = await SupabaseService.partnersNotIgnored(
    userId,
    match.userId,
  );

  // Partners have ignored each other
  if (!partnersCanMatch) {
    logger.debug(
      { userId, partnerId: match.userId },
      'Partners ignored, finding new match',
    );

    // Try finding a new match
    if (position < queueCount && queueCount > 1) {
      return await findMatch(redisQueue, socketId, userId, position + 1);
    }

    logger.debug(
      { userId, partnerId: match.userId },
      'No more matches available, adding to queue',
    );
    await redisQueue.addToQueue(socketId, userId);
    return undefined;
  }

  // Valid match found
  if (match.socketId !== socketId) {
    await redisQueue.removeFromQueue(match.socketId, match.userId);
    return {
      roomId: uuid(),
      partnerSocketId: match.socketId,
      partnerUserId: match.userId,
    };
  } else {
    await redisQueue.addToQueue(socketId, userId);
    return undefined;
  }
};

export const MatchService = {
  findMatch,
};
