import { ClientToServerEvents, ServerToClientEvents } from '@mono/common-dto';
import type { Socket } from 'socket.io-client';

export type ChatSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
