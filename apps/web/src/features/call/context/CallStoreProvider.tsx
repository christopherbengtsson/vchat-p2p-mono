import { useEffect, useRef } from 'react';
import { observer } from 'mobx-react';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { CallStore } from '../store/CallStore';
import { CallStoreContext } from './CallStoreContext';

interface Props extends React.PropsWithChildren {
  callState: {
    roomId: string;
    partnerSocketId: string;
    partnerUserId: string;
    isPolite: boolean;
  };
}

export const CallStoreProvider = observer(function CallStoreProvider({
  children,
  callState,
}: Props) {
  const rootStore = useRootStore();
  const callStoreRef = useRef(new CallStore(rootStore, callState));
  const store = callStoreRef.current;

  useEffect(() => {
    return () => {
      store?.cleanupAfterCall();
    };
  }, [store]);

  return (
    <CallStoreContext.Provider value={store}>
      {children}
    </CallStoreContext.Provider>
  );
});
