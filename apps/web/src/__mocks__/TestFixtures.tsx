import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RootStore } from '@/stores/RootStore';
import { RootStoreProvider } from '@/stores/context/RootStoreProvider';
import { CallStoreContext } from '@/features/call/context/CallStoreContext';
import { CallStore } from '@/features/call/store/CallStore';

export function TestWithQueryClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

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
