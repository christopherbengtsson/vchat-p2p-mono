import { lazy, Suspense } from 'react';
import { observer } from 'mobx-react';
import { GameStoreProvider } from '../../game-engine/context/GameStoreProvider';

const PutinsPuppetContainer = lazy(() =>
  import('../../putins-puppet/container/PutinsPuppetContainer').then(
    (module) => ({
      default: module.PutinsPuppetContainer,
    }),
  ),
);

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
      <Suspense fallback={null}>
        <PutinsPuppetContainer setGameActive={setGameActive} />
      </Suspense>
    </GameStoreProvider>
  );
});
