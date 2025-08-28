import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { MAX_IGNORED_USERS } from '@mono/common-util';
import type { VChatSocket } from '@mono/fe-dto';
import type { Maybe } from '@mono/common-dto';
import { RouterStateUtil } from '@/common/utils/RouterStateUtil';
import { RoutePath } from '@/RoutePath';
import { CallLocation } from '../model/CallLocationState';
import { CallStore } from '../../store/CallStore';
import { useFetchUser } from '../../../home/hooks/useFetchUser';

interface In {
  socket: Maybe<VChatSocket>;
  socketId: Maybe<string>;
  userId: string;
}

export const useFindMatchOnMount = ({ socket, socketId, userId }: In) => {
  const { state } = useLocation() as CallLocation;
  const { user } = useFetchUser();
  const navigate = useNavigate();

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (user.ignoredUserIds.length > MAX_IGNORED_USERS) {
      toast.error(
        "Unreasonable amount of ignored users. You can't proceed until you've cleaned up your ignore list.",
      );
      console.error('UNREASONABLE_IGNORE_LIST');
      navigate(RoutePath.HOME, { replace: true });
      return;
    }

    if (state?.findMatch && socketId && user?.id) {
      const timeoutMS = state?.slow ? CallStore.NEW_MATCH_TIMEOUT : 0;

      timeout = setTimeout(() => {
        socket?.emit('find-match', socketId, userId, user.ignoredUserIds);
      }, timeoutMS);

      RouterStateUtil.clear();
    } else {
      navigate(RoutePath.HOME, { replace: true });
    }

    return () => {
      clearTimeout(timeout);
    };
  }, [
    navigate,
    socket,
    socketId,
    state?.findMatch,
    state?.slow,
    user?.id,
    user?.ignoredUserIds,
    userId,
  ]);
};
