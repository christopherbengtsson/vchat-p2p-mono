import { ReactNode } from 'react';
import { AuthStoreContext } from './AuthStoreContext';
import { AuthStore } from './AuthStore';

export function AuthStoreProvider({
  store,
  children,
}: {
  store: AuthStore;
  children: ReactNode;
}) {
  return (
    <AuthStoreContext.Provider value={store}>
      {children}
    </AuthStoreContext.Provider>
  );
}
