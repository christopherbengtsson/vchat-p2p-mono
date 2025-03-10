import { useRef } from 'react';
import type { CallStoreParams } from '../in-call/model/CallStoreParams';
import { CallStore } from '../store/CallStore';
import { CallStoreContext } from './CallStoreContext';

interface Props extends React.PropsWithChildren {
  callState: CallStoreParams;
}

export function CallStoreProvider({ children, callState }: Props) {
  const callStoreRef = useRef(new CallStore(callState));
  const store = callStoreRef.current;

  return (
    <CallStoreContext.Provider value={store}>
      {children}
    </CallStoreContext.Provider>
  );
}
