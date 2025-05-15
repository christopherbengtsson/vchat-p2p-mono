import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { observer } from 'mobx-react';
import { Assert, BanDuration, Maybe } from '@mono/common-dto';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { ReportButton } from '../component/ReportButton';
import { ReportDialog } from '../component/ReportDialog';
import { useReportUser } from '../hooks/useReportUser';
import { InCallService } from '../../call/in-call/service/InCallService';
import { useCallStore } from '../../call/context/useCallStore';

// TODO: Ban user with reason, e.g. harassment, spam, etc.
export const ReportContainer = observer(function ReportContainer() {
  const navigate = useNavigate();
  const { authStore, socketStore } = useRootStore();
  const callStore = useCallStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { mutate: reportUser, isPending } = useReportUser();

  const onOpen = () => {
    setDialogOpen(true);
  };

  const onCancel = () => {
    if (!isPending) {
      setDialogOpen(false);
    }
  };

  const handleReportSuccess = useCallback(
    (banDuration: BanDuration) => {
      const partnerUserId = callStore.partnerUserId;
      const partnerSocketId = callStore.partnerSocketId;

      if (banDuration !== BanDuration.NO_BAN) {
        socketStore.socket?.emit('ban-user', {
          partnerUserId,
          partnerSocketId,
          banDuration,
        });
      } else {
        socketStore.socket?.emit(
          'user-reported',
          partnerSocketId,
          partnerUserId,
          authStore.userId,
        );
      }
    },
    [
      authStore.userId,
      callStore.partnerSocketId,
      callStore.partnerUserId,
      socketStore.socket,
    ],
  );

  const handleReportSettled = useCallback(
    (banDuration: Maybe<BanDuration>) => {
      setDialogOpen(false);

      // If user gets banned, call is automagically ended since the banned user gets disconnected
      if (banDuration === BanDuration.NO_BAN || banDuration === undefined) {
        Assert.isDefined(socketStore.maybeId, 'Socket id is not defined');
        InCallService.endCall(
          socketStore.socket,
          callStore.roomId,
          socketStore.maybeId,
          navigate,
        );
      }
    },
    [callStore.roomId, navigate, socketStore.maybeId, socketStore.socket],
  );

  const onReportClick = useCallback(() => {
    reportUser(
      {
        reporterId: authStore.userId,
        toReportId: callStore.partnerUserId,
      },
      {
        onSuccess: handleReportSuccess,
        onSettled: handleReportSettled,
      },
    );
  }, [
    authStore.userId,
    callStore.partnerUserId,
    handleReportSettled,
    handleReportSuccess,
    reportUser,
  ]);

  return (
    <>
      <ReportButton onClick={onOpen} />
      <ReportDialog
        open={dialogOpen}
        onCancel={onCancel}
        onReport={onReportClick}
        isLoading={isPending}
      />
    </>
  );
});
