import { v4 as uuid } from 'uuid';
import type { Maybe } from '@mono/common-dto';

import { SupabaseService } from '../supabase/service/SupabaseService.js';
import logger from '../utils/logger.js';
import type { VChatSocket } from '../model/VChatSocket.js';
import type { WaitingQueueService } from './WaitingQueueService.js';

const createRoom = (
  socket: VChatSocket,
  currentUser: { socketId: string; userId: string },
  partner: { socketId: string; userId: string },
) => {
  const roomId = uuid();

  // Inform the user that a match was found
  socket.emit('match-found', roomId, partner.socketId, partner.userId, true);
  // Inform the partner that a match was found
  socket
    .to(partner.socketId)
    .emit(
      'match-found',
      roomId,
      currentUser.socketId,
      currentUser.userId,
      false,
    );
};

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
  socket: VChatSocket,
  socketId: string,
  userId: string,
  position = 0,
) => {
  const [match, queueCount] = await Promise.all([
    redisQueue.getFirstInQueue(position),
    redisQueue.getQueueCount(),
  ]);

  // Queue is empty or no more matches available
  if (queueCount <= 0 || (position > 0 && !match)) {
    return await redisQueue.addToQueue(socketId, userId);
  }

  // Invalid match data
  if (!match?.userId || !match?.socketId || !socketId || !userId) {
    return await handleNoValidMatch(redisQueue, socketId, userId);
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
    if (position < queueCount) {
      return await findMatch(
        redisQueue,
        socket,
        socketId,
        userId,
        position + 1,
      );
    }

    logger.debug(
      { userId, partnerId: match.userId },
      'No more matches available, adding to queue',
    );
    return await redisQueue.addToQueue(socketId, userId);
  }

  // Valid match found
  if (match.socketId !== socketId) {
    createRoom(
      socket,
      { socketId, userId },
      { socketId: match.socketId, userId: match.userId },
    );
  } else {
    await redisQueue.addToQueue(socketId, userId);
  }
};

export const MatchService = {
  findMatch,
};
