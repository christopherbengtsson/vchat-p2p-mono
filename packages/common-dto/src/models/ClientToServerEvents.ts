import { PeerMessage } from './PeerMessage.js';

export interface ClientToServerEvents {
  'send-message': (roomId: string, message: string) => void;

  'find-match': (userId: string) => void;
  'skip-user': (roomId: string, userId: string) => void;
  'cancel-match': (userId: string) => void;

  'join-room': (roomId: string, userId: string) => void;
  'leave-room': (roomId: string, userId: string) => void;

  'audio-toggle': (enabled: boolean, roomId: string) => void;
  'video-toggle': (enabled: boolean, roomId: string) => void;

  'send-game-invite': (roomId: string) => void;
  'answer-game-invite': (roomId: string, accept: boolean) => void;

  'peer-message': (data: PeerMessage, roomId: string, userId: string) => void;
}
