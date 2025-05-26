import type { Namespace } from 'socket.io';
import throttle from 'lodash.throttle';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@mono/common-dto';

export const nspEmitters = (
  nsp: Namespace<ClientToServerEvents, ServerToClientEvents>,
) => {
  const emitConnectionsCount = () => {
    nsp.emit('connections-count', nsp.sockets.size);
  };

  const connectionsCount = throttle(emitConnectionsCount, 5000, {
    leading: true,
    trailing: true,
  });

  return {
    connectionsCount,
  };
};
