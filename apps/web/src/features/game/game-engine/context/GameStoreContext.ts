import { createContext } from 'react';
import { GameStore } from './GameStore';

export const GameStoreContext = createContext<GameStore>({} as GameStore);
