// apps/server/src/socket/nspEmitters.ts

import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@mono/common-dto';
import type { Namespace } from 'socket.io';
import throttle from 'lodash.throttle';

export const nspEmitters = (
  nsp: Namespace<ClientToServerEvents, ServerToClientEvents>,
) => {
  let throttled = false;

  const emitConnectionsCount = () => {
    nsp.emit('connections-count', nsp.sockets.size);
  };

  const throttledEmit = throttle(
    () => {
      if (throttled) {
        emitConnectionsCount();
        throttled = false;
      }
    },
    5000,
    {
      leading: false,
      trailing: true,
    },
  );

  const connectionsCount = () => {
    if (!throttled) {
      // First call, emit immediately
      emitConnectionsCount();
      throttled = true;
      throttledEmit();
    } else {
      // Subsequent calls during throttle period
      throttled = true;
      throttledEmit();
    }
  };

  return {
    connectionsCount,
  };
};
