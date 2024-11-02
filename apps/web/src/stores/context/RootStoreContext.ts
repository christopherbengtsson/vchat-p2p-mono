import { createContext, useContext } from 'react';
import type { RootStore } from '../RootStore';

export const RootStoreContext = createContext<RootStore>({} as RootStore);

export function useRootStore() {
  return useContext(RootStoreContext);
}
