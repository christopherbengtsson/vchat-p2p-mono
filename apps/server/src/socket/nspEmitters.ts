import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@mono/common-dto';
import type { Namespace } from 'socket.io';
import throttle from 'lodash.throttle';

export const nspEmitters = (
  nsp: Namespace<ClientToServerEvents, ServerToClientEvents>,
) => ({
  connectionsCount: throttle(
    () => {
      nsp.emit('connections-count', nsp.sockets.size);
    },
    5000,
    { leading: true, trailing: true },
  ),
});
