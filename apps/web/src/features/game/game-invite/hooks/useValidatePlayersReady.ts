import { Assert } from '@mono/common-dto';
import { useEffect, useState } from 'react';

export const useValidatePlayersReady = (
  userId: string,
  setGameActive: (val: boolean) => void,
) => {
  const [playersReady, setPlayersReady] = useState<string[]>([userId]);

  useEffect(() => {
    if (playersReady.length >= 2) {
      const uniquePlayers = [...new Set(playersReady)];
      Assert.isTrue(uniquePlayers.includes(userId));
      Assert.isTrue(uniquePlayers.length === 2);
      Assert.isTrue(
        playersReady.every((playerId) => uniquePlayers.includes(playerId)),
      );

      setGameActive(true);
    }
  }, [playersReady, setGameActive, userId]);

  return {
    setPlayersReady,
    initiateGame: playersReady.length === 2,
  };
};
