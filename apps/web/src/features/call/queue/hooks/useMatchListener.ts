import { useEffect } from 'react';
import { generatePath, useNavigate } from 'react-router-dom';
import type { Maybe } from '@mono/common-dto';
import type { VChatSocket } from '@mono/fe-dto';
import { RoutePath } from '@/RoutePath';

export const useOnMatchFound = (socket: Maybe<VChatSocket>) => {
  const navigate = useNavigate();

  useEffect(() => {
    socket?.on(
      'match-found',
      (roomId, partnerSocketId, partnerUserId, isPolite) => {
        navigate(
          generatePath(RoutePath.IN_CALL, {
            roomId,
          }),
          {
            state: {
              partnerSocketId,
              partnerUserId,
              isPolite,
            },
          },
        );
      },
    );

    return () => {
      socket?.off('match-found');
    };
  }, [navigate, socket]);
};
