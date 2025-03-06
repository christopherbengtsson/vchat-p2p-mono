import { ReactNode } from 'react';
import { RootStore } from '@/stores/RootStore';
import { RootStoreProvider } from '@/stores/context/RootStoreProvider';
import { CallStoreContext } from '../features/call/context/CallStoreContext';
import { CallStore } from '../features/call/store/CallStore';

interface TestWithRootStoreContextProps {
  rootStore?: RootStore;
  children: ReactNode;
}

export function TestWithRootStoreContext({
  rootStore = new RootStore(),
  children,
}: TestWithRootStoreContextProps) {
  return <RootStoreProvider store={rootStore}>{children}</RootStoreProvider>;
}

export function TestWithCallStoreContext({
  callStore,
  children,
}: {
  callStore: CallStore;
  children: ReactNode;
}) {
  return (
    <CallStoreContext.Provider value={callStore}>
      {children}
    </CallStoreContext.Provider>
  );
}
