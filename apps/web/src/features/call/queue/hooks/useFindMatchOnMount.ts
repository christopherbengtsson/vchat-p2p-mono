import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { VChatSocket } from '@mono/fe-dto';
import type { Maybe } from '@mono/common-dto';
import { RouterStateUtil } from '@/common/utils/RouterStateUtil';
import { RoutePath } from '@/RoutePath';
import { CallStore } from '../../store/CallStore';

export interface CallLocation {
  state: Maybe<{
    findMatch: boolean;
    slow?: boolean;
  }>;
}

interface In {
  socket: Maybe<VChatSocket>;
  socketId: Maybe<string>;
  userId: string;
}

export const useFindMatchOnMount = ({ socket, socketId, userId }: In) => {
  const { state } = useLocation() as CallLocation;
  const navigate = useNavigate();

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (state?.findMatch && socketId) {
      const timeoutMS = state?.slow ? CallStore.NEW_MATCH_TIMEOUT : 0;

      timeout = setTimeout(() => {
        socket?.emit('find-match', socketId, userId);
      }, timeoutMS);

      RouterStateUtil.clear();
    } else {
      navigate(RoutePath.HOME, { replace: true });
    }

    return () => {
      clearTimeout(timeout);
    };
  }, [navigate, socket, socketId, state?.findMatch, state?.slow, userId]);
};
