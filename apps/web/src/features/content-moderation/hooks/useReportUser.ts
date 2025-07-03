import { useCallback } from 'react';
import { NavigateFunction } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { PostgrestError } from '@supabase/supabase-js';
import { Assert, BanDuration, CustomError, Maybe } from '@mono/common-dto';
import { VChatSocket } from '@mono/fe-dto';
import { DatabaseService } from '@mono/common-supabase';
import { SupabaseClient } from '@/common/clients/supabase';
import { InCallService } from '../../call/in-call/service/InCallService';

const client = SupabaseClient.instance;

interface In {
  maybeSocketId: Maybe<string>;
  socket: Maybe<VChatSocket>;
  roomId: string;
  reporterUserId: string;
  partnerUserId: string;
  partnerSocketId: string;
  doOnSettled?: VoidFunction;
  navigate: NavigateFunction;
}

export const useReportUser = ({
  maybeSocketId,
  socket,
  roomId,
  reporterUserId,
  partnerUserId,
  partnerSocketId,
  navigate,
  doOnSettled,
}: In) => {
  const { mutate, isPending } = useMutation<
    BanDuration,
    PostgrestError | CustomError,
    { reporterId: string; toReportId: string }
  >({
    mutationFn: ({ reporterId, toReportId }) =>
      DatabaseService.reportUser(client, reporterId, toReportId),
    onError: (error) => {
      console.error(error);
    },
  });

  const onSuccess = useCallback(
    (banDuration: BanDuration) => {
      if (banDuration !== BanDuration.NO_BAN) {
        socket?.emit('ban-user', {
          partnerSocketId,
          partnerUserId,
          banDuration,
        });
      } else {
        socket?.emit(
          'user-reported',
          partnerSocketId,
          partnerUserId,
          reporterUserId,
        );
      }
    },
    [partnerSocketId, partnerUserId, reporterUserId, socket],
  );

  const onSettled = useCallback(
    (banDuration: Maybe<BanDuration>) => {
      doOnSettled?.();

      // If user gets banned, call is automagically ended since the banned user gets disconnected
      if (banDuration === BanDuration.NO_BAN || banDuration === undefined) {
        Assert.isDefined(maybeSocketId, 'Socket id is not defined');
        InCallService.endCall(socket, roomId, maybeSocketId, navigate);
      }
    },
    [doOnSettled, maybeSocketId, navigate, roomId, socket],
  );

  const onReportClick = useCallback(() => {
    mutate(
      {
        reporterId: reporterUserId,
        toReportId: partnerUserId,
      },
      {
        onSuccess,
        onSettled,
      },
    );
  }, [mutate, reporterUserId, partnerUserId, onSuccess, onSettled]);

  return {
    isReporting: isPending,
    onReportClick,
  };
};
