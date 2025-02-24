import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Maybe } from '@mono/common-dto';
import { RouterStateUtil } from '@/common/utils/RouterStateUtil';
import { RoutePath } from '@/RoutePath';
import { ChatSocket } from '../../../../stores/model/SocketModel';

interface CallLocation {
  state: Maybe<{
    findMatch: boolean;
    slow?: boolean;
  }>;
}

interface In {
  socket: Maybe<ChatSocket>;
  socketId: Maybe<string>;
  userId: string;
}

export const useFindMatchOnMount = ({ socket, socketId, userId }: In) => {
  const { state } = useLocation() as CallLocation;
  const navigate = useNavigate();

  const findMatch = useCallback(
    (socketId: string, userId: string, slow: boolean) => {
      const timeout = slow ? 2000 : 0; // TODO: Constants
      setTimeout(() => {
        socket?.emit('find-match', socketId, userId);
      }, timeout);
    },
    [socket],
  );

  useEffect(() => {
    if (state?.findMatch && socketId) {
      findMatch(socketId, userId, !!state?.slow);
      RouterStateUtil.clear();
    } else {
      navigate(RoutePath.HOME, { replace: true });
    }
  }, [findMatch, navigate, socketId, state?.findMatch, state?.slow, userId]);
};
