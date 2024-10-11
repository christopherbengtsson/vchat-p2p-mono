import { ReactNode } from 'react';
import { RootStoreContext } from './RootStoreContext';
import type { RootStore } from './RootStore';

export function RootStoreProvider({
  store,
  children,
}: {
  store: RootStore;
  children: ReactNode;
}) {
  return (
    <RootStoreContext.Provider value={store}>
      {children}
    </RootStoreContext.Provider>
  );
}
