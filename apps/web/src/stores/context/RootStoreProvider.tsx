import { ReactNode } from 'react';
import type { RootStore } from '../RootStore';
import { RootStoreContext } from './RootStoreContext';

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
