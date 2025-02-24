import { useContext } from 'react';
import { CallStoreContext } from './CallStoreContext';

export function useCallStore() {
  return useContext(CallStoreContext);
}
