import type { Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@mono/common-dto';

export type VChatSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
