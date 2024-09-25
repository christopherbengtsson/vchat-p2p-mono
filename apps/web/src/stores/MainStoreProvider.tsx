import { ReactNode } from 'react';
import { MainStoreContext } from './MainStoreContext';
import { MainStore } from './MainStore';

export function MainStoreProvider({
  store,
  children,
}: {
  store: MainStore;
  children: ReactNode;
}) {
  return (
    <MainStoreContext.Provider value={store}>
      {children}
    </MainStoreContext.Provider>
  );
}
