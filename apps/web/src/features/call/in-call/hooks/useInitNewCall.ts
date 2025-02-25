import { useEffect } from 'react';
import type { SocketStore } from '@/stores/SocketStore';
import type { MediaStore } from '@/stores/MediaStore';
import { RouterStateUtil } from '@/common/utils/RouterStateUtil';
import type { CallStore } from '../../store/CallStore';
import { InCallService } from '../service/InCallService';

interface In {
  state: {
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
  state,
  callStore,
  mediaStore,
  socketStore,
}: In) => {
  useEffect(() => {
    callStore.setCallObservables({
      roomId: state.roomId,
      partnerSocketId: state.partnerSocketId,
      partnerUserId: state.partnerUserId,
      isPolite: state.isPolite,
    });

    InCallService.initNewCall({
      roomId: state.roomId,
      partnerSocketId: state.partnerSocketId,
      isPolite: state.isPolite,
      callStore,
      socketStore,
      mediaStore,
    });

    socketStore.socket?.emit('join-room', state.roomId, socketStore.id);
    RouterStateUtil.clear();
  }, [
    callStore,
    mediaStore,
    socketStore,
    socketStore.id,
    socketStore.socket,
    state.isPolite,
    state.partnerSocketId,
    state.partnerUserId,
    state.roomId,
  ]);
};
