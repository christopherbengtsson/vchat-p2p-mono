import { useEffect } from 'react';
import { InviteData } from '@mono/common-dto';
import { GameInviteService } from '../service/GameInviteService';

export const useGameInviteListeners = (
  onMessageCallback: (inviteData: InviteData) => void,
) => {
  useEffect(() => {
    GameInviteService.addListener(onMessageCallback);
    return () => {
      GameInviteService.removeListener(onMessageCallback);
    };
  }, [onMessageCallback]);
};
