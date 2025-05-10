import { observer } from 'mobx-react';
import { GameStoreProvider } from '../../game-engine/context/GameStoreProvider';
import { PutinsPuppetContainer } from '../../putins-puppet/container/PutinsPuppetContainer';

interface Props {
  initiator: boolean;
  playerId: string;
  setGameActive: (val: boolean) => void;
}

export const GameEngineContainer = observer(function GameEngineContainer({
  initiator,
  playerId,
  setGameActive,
}: Props) {
  return (
    <GameStoreProvider playerId={playerId} isMyTurn={initiator}>
      <PutinsPuppetContainer setGameActive={setGameActive} />
    </GameStoreProvider>
  );
});
