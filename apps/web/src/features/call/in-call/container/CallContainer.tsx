import { observer } from 'mobx-react';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { useCallStore } from '../../context/useCallStore';
import { CallState } from '../page/InCallPage';
import { useInCallListeners } from '../hooks/useInCallListeners';
import { useInitNewCall } from '../hooks/useInitNewCall';
import { InCallContainer } from './InCallContainer';
import { NewMatchContainer } from './NewMatchContainer';

interface Props {
  state: CallState & {
    roomId: string;
  };
}
export const CallContainer = observer(function CallContainer({ state }: Props) {
  const { socketStore, mediaStore } = useRootStore();
  const callStore = useCallStore();

  useInCallListeners(socketStore.socket);
  useInitNewCall({ state, callStore, socketStore, mediaStore });

  if (!callStore.isConnected) {
    // TODO: Set some timeout, if 'connecting' > x seconds
    return <NewMatchContainer partnerSocketId={state.partnerSocketId} />;
  }

  return <InCallContainer />;
});
