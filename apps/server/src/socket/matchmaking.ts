import { v4 as uuid } from 'uuid';
import logger from '../utils/logger.js';
import { InMemoryDB } from '../db/InMemoryDB.js';
import type { VChatSocket } from '../models/VChatSocket.js';

const waitingQueue = InMemoryDB.waitingQueue;
/**
 * TODO:
 * We could utilize the `videoChat`-param namespace to implement broader matchmaking features,
 * such as broadcasting available users or managing global matchmaking states.
 * For example, we could use it to emit events to all connected clients or to manage room-wide operations.
 * This would allow for more sophisticated matchmaking algorithms or features in the future.
 */
export function setupMatchmaking(
  socket: VChatSocket,
  wrapHandler: <T extends (...args: string[]) => void>(
    handler: T,
  ) => (...args: Parameters<T>) => void,
) {
  socket.on(
    'find-match',
    wrapHandler((userId) => {
      const partnerId = waitingQueue.getFirstInQueue;

      if (waitingQueue.queueCount > 0 && partnerId !== userId) {
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

        logger.debug({ roomId, userId, partnerId }, 'Match found');
      } else {
        waitingQueue.addToQueue(socket.id);
        logger.debug(
          { numbersInQueue: waitingQueue.queueCount, userId },
          'User added to waiting queue',
        );
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
    wrapHandler(() => {
      waitingQueue.removeFromQueue(socket.id);
      logger.debug(
        { userId: socket.id, numbersInQueue: waitingQueue.queueCount },
        'Cancel matching. User removed from matchmaking queue',
      );
    }),
  );

  socket.on(
    'disconnect',
    wrapHandler(() => {
      waitingQueue.removeFromQueue(socket.id);

      logger.debug(
        { userId: socket.id, numbersInQueue: waitingQueue.queueCount },
        'Disconnected. User removed from matchmaking queue',
      );
    }),
  );
}
