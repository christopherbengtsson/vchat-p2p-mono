import { observer } from 'mobx-react';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { useCallStore } from '../../context/useCallStore';
import { CallRouterStateProps } from '../model/CallRouterStateProps';
import { useInCallListeners } from '../hooks/useInCallListeners';
import { useInitNewCall } from '../hooks/useInitNewCall';
import { InCallContainer } from './InCallContainer';
import { NewMatchContainer } from './NewMatchContainer';

interface Props {
  routerState: CallRouterStateProps & {
    roomId: string;
  };
}
export const CallContainer = observer(function CallContainer({
  routerState,
}: Props) {
  const { socketStore, mediaStore } = useRootStore();
  const callStore = useCallStore();

  useInCallListeners(socketStore.socket);
  useInitNewCall({ routerState, callStore, socketStore, mediaStore });

  if (!callStore.connectionEstablished) {
    // TODO: Set some timeout, if 'connecting' > x seconds
    return <NewMatchContainer partnerSocketId={routerState.partnerSocketId} />;
  }

  return <InCallContainer />;
});
