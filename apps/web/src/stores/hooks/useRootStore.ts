import { useContext } from 'react';
import { RootStoreContext } from '../context/RootStoreContext';

export function useRootStore() {
  return useContext(RootStoreContext);
}
