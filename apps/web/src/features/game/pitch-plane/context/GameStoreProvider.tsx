import { useRef } from 'react';
import { GameStore } from '@/features/game/pitch-plane/context/GameStore';
import { GameStoreContext } from './GameStoreContext';

interface Props extends React.PropsWithChildren {
  playerId: string;
  isMyTurn: boolean;
}

export function GameStoreProvider({ playerId, isMyTurn, children }: Props) {
  const gameStoreRef = useRef(new GameStore(playerId, isMyTurn));
  const store = gameStoreRef.current;

  return (
    <GameStoreContext.Provider value={store}>
      {children}
    </GameStoreContext.Provider>
  );
}
