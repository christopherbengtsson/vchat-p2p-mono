import { BanDuration } from './BanDuration.js';
import { BrowserSignature } from './BrowserSignature.js';
import { PeerMessage } from './PeerMessage.js';

export interface ClientToServerEvents {
  'send-message': (roomId: string, message: string) => void;

  'find-match': (socketId: string, userId: string) => void;
  'skip-user': (roomId: string, socketId: string) => void;
  'cancel-match': (userId: string) => void;

  'join-room': (roomId: string, socketId: string) => void;
  'leave-room': (roomId: string, socketId: string) => void;

  'peer-message': (data: PeerMessage, roomId: string, socketId: string) => void;

  'audio-toggle': (enabled: boolean, roomId: string) => void;
  'video-toggle': (enabled: boolean, roomId: string) => void;

  'ban-user': (args: {
    partnerUserId: string;
    partnerSocketId: string;
    banDuration: BanDuration;
  }) => void;

  'browser-signature': (browserSignature: BrowserSignature) => void;
}
