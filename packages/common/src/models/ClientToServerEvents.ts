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
