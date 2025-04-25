import { observer } from 'mobx-react';
import { GameStoreProvider } from '../../game-engine/context/GameStoreProvider';
import { FlappyBirdContainer } from '../../flappy-bird/container/FlappyBirdContainer';

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
      <FlappyBirdContainer setGameActive={setGameActive} />
    </GameStoreProvider>
  );
});
