import { v4 as uuid } from 'uuid';
import logger from '../utils/logger.js';
import type { VChatSocket } from '../models/VChatSocket.js';
import type { RedisQueue } from '../services/RedisQueue.js';

/**
 * TODO:
 * We could utilize the `videoChat`-param namespace to implement broader matchmaking features,
 * such as broadcasting available users or managing global matchmaking states.
 * For example, we could use it to emit events to all connected clients or to manage room-wide operations.
 * This would allow for more sophisticated matchmaking algorithms or features in the future.
 */
export function setupMatchmaking(
  socket: VChatSocket,
  redisQueue: RedisQueue,
  wrapHandler: <T extends (...args: string[]) => void>(
    handler: T,
  ) => (...args: Parameters<T>) => void,
) {
  socket.on(
    'find-match',
    wrapHandler(async (userId) => {
      const [partnerId, queueCount] = await Promise.all([
        redisQueue.getFirstInQueue(),
        redisQueue.getQueueCount(),
      ]);

      if (queueCount > 0 && partnerId !== userId) {
        if (!partnerId || !userId) {
          logger.error(
            { partnerId, userId },
            'No partnerId or userId, cannot create room',
          );
          return;
        }

        const roomId = uuid();

        socket.to(partnerId).emit('match-found', roomId, userId, false); // Inform parter
        socket.emit('match-found', roomId, partnerId, true); // Inform current user
      } else {
        await redisQueue.addToQueue(socket.id);
      }
    }),
  );

  socket.on(
    'skip-user',
    wrapHandler((roomId, userId) => {
      console.log('skip-user', roomId, userId);
      socket.leave(roomId);
      socket.to(roomId).emit('user-skipped');
      socket.emit('find-match', userId);

      logger.debug({ roomId, userId }, 'User skipped');
    }),
  );

  socket.on(
    'cancel-match',
    wrapHandler(async () => {
      await redisQueue.removeFromQueue(socket.id);
    }),
  );

  socket.on(
    'disconnect',
    wrapHandler(async () => {
      await redisQueue.removeFromQueue(socket.id);
    }),
  );
}
