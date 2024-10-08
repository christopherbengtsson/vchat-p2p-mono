import type { Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from 'common';

export type VChatSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
