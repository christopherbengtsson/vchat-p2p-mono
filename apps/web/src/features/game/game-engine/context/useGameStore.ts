import { useContext } from 'react';
import { GameStoreContext } from './GameStoreContext';

export function useGameStore() {
  return useContext(GameStoreContext);
}
