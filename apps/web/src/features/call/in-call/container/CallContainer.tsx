import { useEffect } from 'react';
import { observer } from 'mobx-react';
import { RouterStateUtil } from '@/common/utils/RouterStateUtil';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { useCallStore } from '../../context/useCallStore';
import { CallState } from '../page/InCallPage';
import { useInCallListeners } from '../hooks/useInCallListeners';
import { InCallContainer } from './InCallContainer';
import { NewMatchContainer } from './NewMatchContainer';

interface Props {
  state: CallState & {
    roomId: string;
  };
}
export const CallContainer = observer(function CallContainer({ state }: Props) {
  const { socketStore } = useRootStore();
  const callStore = useCallStore();

  useInCallListeners(socketStore.socket);

  useEffect(() => {
    callStore.initNewCall(
      state.roomId,
      state.partnerSocketId,
      state.partnerUserId,
      state.isPolite,
    );

    socketStore.socket?.emit('join-room', state.roomId, socketStore.id);
    RouterStateUtil.clear();
  }, [
    callStore,
    socketStore.id,
    socketStore.socket,
    state.isPolite,
    state.partnerSocketId,
    state.partnerUserId,
    state.roomId,
  ]);

  if (!callStore.isConnected) {
    // TODO: Set some timeout, if 'connecting' > x seconds
    return <NewMatchContainer partnerSocketId={state.partnerSocketId} />;
  }

  return <InCallContainer />;
});
