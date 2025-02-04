import { PeerMessage } from './PeerMessage.js';

export interface ServerToClientEvents {
  'match-found': (
    roomId: string,
    partnerSocketId: string,
    partnerUserId: string,
    createOffer: boolean,
  ) => void;
  'find-match': (userId: string) => void;
  'user-joined': (userId: string) => void;
  'user-left': (userId: string) => void;
  'partner-disconnected': VoidFunction;
  'connections-count': (count: number) => void;

  'peer-message': (data: PeerMessage, userId: string) => void;

  'audio-toggle': (enabled: boolean) => void;
  'video-toggle': (enabled: boolean) => void;

  'user-banned': VoidFunction;
}
