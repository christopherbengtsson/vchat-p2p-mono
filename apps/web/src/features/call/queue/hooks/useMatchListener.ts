import { useEffect } from 'react';
import { generatePath, useNavigate } from 'react-router-dom';
import { Maybe } from '@mono/common-dto';
import { RoutePath } from '@/RoutePath';
import { ChatSocket } from '@/stores/model/SocketModel';

export const useOnMatchFound = (socket: Maybe<ChatSocket>) => {
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
