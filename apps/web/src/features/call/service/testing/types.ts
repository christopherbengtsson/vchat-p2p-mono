import { Maybe } from '@mono/common-dto';
import { ChatSocket } from '../../../../stores/model/SocketModel';
import { GameData } from '../../../../stores/model/GameData';

export interface Observables {
  socket: Maybe<ChatSocket>;
  localStream: Maybe<MediaStream>;
  roomId: Maybe<string>;
  partnerSocketId: Maybe<string>;
  isPolite: boolean;
}

export interface Setters {
  setRemoteStream: (stream: MediaStream) => void;
}

export interface Callbacks {
  handlePartnerVideoToggle: (toggle: boolean) => void;
  handlePartnerAudioToggle: (toggle: boolean) => void;
}

export interface Injectables {
  handleIncomingGameMessage?: (message: GameData) => void;
  setRemoteCanvasStream?: (stream: MediaStream) => void;
}

export interface WebRTCParams {
  observables: Observables;
  setters: Setters;
  callbacks: Callbacks;
  injectables: Maybe<Injectables>;
}
