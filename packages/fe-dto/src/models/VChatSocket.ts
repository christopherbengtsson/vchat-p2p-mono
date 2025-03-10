import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@mono/common-dto';
import type { Socket } from 'socket.io-client';

export type VChatSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
