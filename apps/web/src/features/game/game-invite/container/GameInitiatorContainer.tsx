import { useCallback, useState } from 'react';
import { observer } from 'mobx-react';
import { InviteData } from '@mono/common-dto';
import { GameEngineContainer } from '../../game-engine/container/GameEngineContainer';
import { useGameInviteListeners } from '../hooks/useGameInviteListeners';
import { useValidatePlayersReady } from '../hooks/useValidatePlayersReady';

interface Props {
  userId: string;
  gameActive: boolean;
  setGameActive: (val: boolean) => void;
}

export const GameInitiatorContainer = observer(function GameInitiatorContainer({
  userId,
  gameActive,
  setGameActive,
}: Props) {
  const [initiator, setInitiator] = useState(false);
  const { setPlayersReady } = useValidatePlayersReady(userId, setGameActive);

  const onMessageCallback = useCallback(
    (inviteData: InviteData) => {
      switch (inviteData.type) {
        case 'PLAYER_READY':
          setPlayersReady((prev) => [...prev, inviteData.playerId]);
          setInitiator(!inviteData.initiator);
          break;
      }
    },
    [setPlayersReady],
  );

  useGameInviteListeners(onMessageCallback);

  return (
    gameActive && (
      <GameEngineContainer
        initiator={initiator}
        playerId={userId}
        setGameActive={setGameActive}
      />
    )
  );
});
