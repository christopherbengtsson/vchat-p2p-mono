import { observer } from 'mobx-react';
import { GameStoreProvider } from '../context/GameStoreProvider';
import { Test } from './Test';

interface Props {
  initiator: boolean;
  playerId: string;
  setGameActive: (val: boolean) => void;
}

export const PitchPlaneContainer = observer(function PitchPlaneContainer({
  initiator,
  playerId,
  setGameActive,
}: Props) {
  return (
    <GameStoreProvider playerId={playerId} isMyTurn={initiator}>
      <Test setGameActive={setGameActive} />
    </GameStoreProvider>
  );
});
