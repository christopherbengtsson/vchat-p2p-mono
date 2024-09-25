export interface ServerToClientEvents {
  'receive-message': (message: string) => void;
  'match-found': (
    roomId: string,
    partnerId: string,
    createOffer: boolean,
  ) => void;
  'find-match': (userId: string) => void;
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
