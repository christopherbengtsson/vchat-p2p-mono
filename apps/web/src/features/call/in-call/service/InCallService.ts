import type { NavigateFunction } from 'react-router-dom';
import { toast } from 'sonner';
import { Assert, type Maybe } from '@mono/common-dto';
import type { VChatSocket } from '@mono/fe-dto';
import { WebRTCService } from '@mono/fe-webrtc';
import type { MediaStore } from '@/stores/MediaStore';
import type { SocketStore } from '@/stores/SocketStore';
import { RoutePath } from '@/RoutePath';
import type { CallStore } from '../../store/CallStore';

const initNewCall = ({
  roomId,
  partnerSocketId,
  isPolite,
  callStore,
  socketStore,
  mediaStore,
}: {
  roomId: string;
  partnerSocketId: string;
  isPolite: boolean;
  callStore: CallStore;
  socketStore: SocketStore;
  mediaStore: MediaStore;
}) => {
  Assert.isDefined(mediaStore.stream, 'Local MediaStream is not defined');

  WebRTCService.create({
    observables: {
      socket: socketStore.socket,
      localStream: mediaStore.stream,
      roomId,
      partnerSocketId,
      isPolite,
    },
    callbacks: {
      handlePartnerVideoToggle: callStore.setPartnerVideoEnabled,
      handlePartnerAudioToggle: callStore.setPartnerAudioEnabled,
    },
    setters: {
      setRemoteStream: callStore.setRemoteStream,
      setIsConnected: callStore.setIsConnected,
    },
  });
};

const handlePartnerLeftCall = (
  navigate: NavigateFunction,
  disconnected?: boolean,
) => {
  const message = disconnected
    ? 'Partner disconnected'
    : 'Partner left the call';

  toast(message, {
    id: 'partner-left-call',
  });
  goBack(navigate);
};

const goBack = (navigate: NavigateFunction) => {
  navigate(RoutePath.CALL, {
    replace: true,
    state: {
      findMatch: true,
    },
  });
};

const endCall = (
  socket: Maybe<VChatSocket>,
  roomId: string,
  socketId: string,
  navigate: NavigateFunction,
) => {
  socket?.emit('leave-room', roomId, socketId);
  navigate(RoutePath.CALL, {
    // TODO: Replace?
    state: {
      findMatch: true,
      slow: true,
    },
  });
};

const dispose = () => {
  WebRTCService.get()?.close();
};

export const InCallService = {
  initNewCall,
  handlePartnerLeftCall,
  goBack,
  endCall,

  dispose,
};
