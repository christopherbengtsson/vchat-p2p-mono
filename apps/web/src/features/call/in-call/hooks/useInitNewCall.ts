import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@/RoutePath';
import type { SocketStore } from '@/stores/SocketStore';
import type { MediaStore } from '@/stores/MediaStore';
import { RouterStateUtil } from '@/common/utils/RouterStateUtil';
import type { CallStore } from '../../store/CallStore';
import { InCallService } from '../service/InCallService';

interface In {
  routerState: {
    roomId: string;
    partnerSocketId: string;
    partnerUserId: string;
    isPolite: boolean;
  };
  callStore: CallStore;
  socketStore: SocketStore;
  mediaStore: MediaStore;
}

export const useInitNewCall = ({
  routerState,
  callStore,
  mediaStore,
  socketStore,
}: In) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!mediaStore.localCallStream) {
      navigate(RoutePath.HOME, { replace: true, state: null });
      return;
    }

    InCallService.initNewCall({
      localStream: mediaStore.localCallStream,
      roomId: routerState.roomId,
      partnerSocketId: routerState.partnerSocketId,
      isPolite: routerState.isPolite,
      callStore,
      socketStore,
    });

    socketStore.socket?.emit('join-room', routerState.roomId, socketStore.id);
    RouterStateUtil.clear();

    return () => {
      InCallService.dispose();
    };
  }, [
    callStore,
    mediaStore.localCallStream,
    navigate,
    routerState.isPolite,
    routerState.partnerSocketId,
    routerState.roomId,
    socketStore,
  ]);
};
