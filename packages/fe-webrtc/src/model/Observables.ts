import type { Maybe } from '@mono/common-dto';
import type { VChatSocket } from '@mono/fe-dto';

export interface Observables {
  socket: Maybe<VChatSocket>;
  localStream: MediaStream;
  roomId: Maybe<string>;
  partnerSocketId: Maybe<string>;
  isPolite: boolean;
}
