import type { ClientToServerEvents, ServerToClientEvents } from 'common';
import type { Namespace } from 'socket.io';

export const nspEmitters = (
  nsp: Namespace<ClientToServerEvents, ServerToClientEvents>,
) => ({
  connectionsCount: () => nsp.emit('connections-count', nsp.sockets.size),
});
