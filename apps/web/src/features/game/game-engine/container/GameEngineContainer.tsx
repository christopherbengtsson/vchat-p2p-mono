import { observer } from 'mobx-react';
import { GameStoreProvider } from '../../game-engine/context/GameStoreProvider';
import { FlappyTrumpContainer } from '../../flappy-trump/container/FlappyTrumpContainer';

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
      <FlappyTrumpContainer setGameActive={setGameActive} />
    </GameStoreProvider>
  );
});
