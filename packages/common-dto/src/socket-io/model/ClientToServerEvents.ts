import { PeerMessage } from '../../webrtc/model/PeerMessage.js';
import { BanDuration } from '../../user-ban/model/BanDuration.js';
import { BrowserSignature } from '../../fingerprint/model/BrowserSignature.js';

export interface ClientToServerEvents {
  'find-match': (
    socketId: string,
    userId: string,
    ignoreList: string[],
  ) => void;
  'cancel-match': (userId: string) => void;

  'join-room': (roomId: string, socketId: string) => void;
  'leave-room': (roomId: string, socketId: string) => void;

  'peer-message': (data: PeerMessage, roomId: string, socketId: string) => void;

  'ban-user': (args: {
    partnerUserId: string;
    partnerSocketId: string;
    banDuration: BanDuration;
  }) => void;
  'user-reported': (
    partnerSocketId: string,
    partnerUserId: string,
    userId: string,
  ) => void;

  'browser-signature': (browserSignature: BrowserSignature) => void;
}
