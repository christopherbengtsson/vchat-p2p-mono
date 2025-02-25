import { useEffect } from 'react';
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
  useEffect(() => {
    callStore.setCallObservables({
      roomId: routerState.roomId,
      partnerSocketId: routerState.partnerSocketId,
      partnerUserId: routerState.partnerUserId,
      isPolite: routerState.isPolite,
    });

    InCallService.initNewCall({
      roomId: routerState.roomId,
      partnerSocketId: routerState.partnerSocketId,
      isPolite: routerState.isPolite,
      callStore,
      socketStore,
      mediaStore,
    });

    socketStore.socket?.emit('join-room', routerState.roomId, socketStore.id);
    RouterStateUtil.clear();
  }, [
    callStore,
    mediaStore,
    socketStore,
    socketStore.id,
    socketStore.socket,
    routerState.isPolite,
    routerState.partnerSocketId,
    routerState.partnerUserId,
    routerState.roomId,
  ]);
};
