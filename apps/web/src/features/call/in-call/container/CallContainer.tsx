import { useEffect, useState } from 'react';
import { observer } from 'mobx-react';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { useCallStore } from '../../context/useCallStore';
import { CallRouterStateProps } from '../model/CallRouterStateProps';
import { useInCallListeners } from '../hooks/useInCallListeners';
import { useInitNewCall } from '../hooks/useInitNewCall';
import { InCallContainer } from './InCallContainer';
import { NewMatchContainer } from './NewMatchContainer';

const MIN_MATCH_DISPLAY_DURATION = 2500;

interface Props {
  routerState: CallRouterStateProps & {
    roomId: string;
  };
}
export const CallContainer = observer(function CallContainer({
  routerState,
}: Props) {
  const [minMatchDurationElapsed, setMinMatchDurationElapsed] = useState(false);
  const { socketStore, mediaStore } = useRootStore();
  const callStore = useCallStore();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setMinMatchDurationElapsed(true);
    }, MIN_MATCH_DISPLAY_DURATION);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  useInCallListeners(socketStore.socket);
  useInitNewCall({ routerState, callStore, socketStore, mediaStore });

  if (!minMatchDurationElapsed || !callStore.connectionEstablished) {
    // TODO: Set some timeout, if 'connecting' > x seconds
    return <NewMatchContainer partnerSocketId={routerState.partnerSocketId} />;
  }

  return <InCallContainer />;
});
