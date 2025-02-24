import type { NavigateFunction } from 'react-router-dom';
import { toast } from 'sonner';
import { Maybe } from '@mono/common-dto';
import { ChatSocket } from '@/stores/model/SocketModel';
import { RoutePath } from '@/RoutePath';

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
  socket: Maybe<ChatSocket>,
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

export const InCallService = {
  handlePartnerLeftCall,
  goBack,
  endCall,
};
