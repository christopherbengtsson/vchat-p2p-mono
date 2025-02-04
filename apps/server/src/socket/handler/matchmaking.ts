import type { VChatSocket } from '../../model/VChatSocket.js';
import type { WaitingQueueService } from '../../service/WaitingQueueService.js';
import { MatchService } from '../../service/MatchService.js';

/**
 * TODO:
 * We could utilize the `videoChat`-param namespace to implement broader matchmaking features,
 * such as broadcasting available users or managing global matchmaking states.
 * For example, we could use it to emit events to all connected clients or to manage room-wide operations.
 * This would allow for more sophisticated matchmaking algorithms or features in the future.
 */
export function setupMatchmaking(
  socket: VChatSocket,
  redisQueue: WaitingQueueService,
  wrapHandler: <T extends (...args: string[]) => void>(
    handler: T,
  ) => (...args: Parameters<T>) => void,
) {
  socket.on(
    'find-match',
    wrapHandler(async (socketId, userId) => {
      await MatchService.findMatch(redisQueue, socket, socketId, userId);
    }),
  );

  socket.on(
    'cancel-match',
    wrapHandler(async (userId) => {
      await redisQueue.removeFromQueue(socket.id, userId);
    }),
  );

  socket.on(
    'disconnect',
    wrapHandler(async () => {
      await redisQueue.removeFromQueue(socket.id, undefined);
    }),
  );
}
