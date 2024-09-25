import { createContext, useContext } from 'react';
import type { AuthStore } from './AuthStore';

export const AuthStoreContext = createContext<AuthStore>({} as AuthStore);

export function useAuthStore() {
  return useContext(AuthStoreContext);
}
