import type { Socket } from 'socket.io-client';

// Events sent from the client to the server
export interface ClientToServerEvents {
  'send-message': (roomId: string, message: string) => void;

  'find-match': (userId: string) => void;
  'skip-user': (roomId: string, userId: string) => void;
  'cancel-match': (userId: string) => void;

  'join-room': (roomId: string, userId: string) => void;
  'leave-room': (roomId: string, userId: string) => void;

  'audio-toggle': (enabled: boolean, roomId: string) => void;
  'video-toggle': (enabled: boolean, roomId: string) => void;

  offer: (
    offer: RTCSessionDescriptionInit,
    roomId: string,
    userId: string,
  ) => void;
  answer: (
    answer: RTCSessionDescriptionInit,
    roomId: string,
    userId: string,
  ) => void;
  'ice-candidate': (
    candidate: RTCIceCandidateInit,
    roomId: string,
    userId: string,
  ) => void;
}

// Events sent from the server to the client
export interface ServerToClientEvents {
  'receive-message': (message: string) => void;
  'match-found': (
    roomId: string,
    partnerId: string,
    createOffer: boolean,
  ) => void;
  'user-skipped': VoidFunction;
  'user-connected': (userId: string) => void;
  'user-disconnected': (userId: string) => void;
  'partner-disconnected': VoidFunction;
  'connections-count': (count: number) => void;

  offer: (offer: RTCSessionDescriptionInit, userId: string) => void;
  answer: (answer: RTCSessionDescriptionInit, userId: string) => void;
  'ice-candidate': (candidate: RTCIceCandidateInit, userId: string) => void;

  'audio-toggle': (enabled: boolean) => void;
  'video-toggle': (enabled: boolean) => void;
}
export type ChatSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
