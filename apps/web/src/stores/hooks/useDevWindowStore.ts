import { useEffect } from 'react';
import type { RootStore } from '../RootStore';

export const useDevWindowStore = (store: RootStore) => {
  useEffect(() => {
    if (import.meta.env.DEV) {
      window.rootStore = store;
    }
  }, [store]);
};
