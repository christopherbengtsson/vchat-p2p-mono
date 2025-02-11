import { useCallback, useState } from 'react';
import { observer } from 'mobx-react';
import { BanDuration } from '@mono/common-dto';
import { Assert } from '@/common/utils/Assert';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { ReportButton } from '../component/ReportButton';
import { ReportDialog } from '../component/ReportDialog';
import { useReportUser } from '../hooks/useReportUser';

// TODO: Ban user with reason, e.g. harassment, spam, etc.
export const ReportContainer = observer(function ReportContainer() {
  const { callStore, authStore, socketStore } = useRootStore();
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
      Assert.isDefined(partnerUserId, 'partnerUserId is not defined');
      Assert.isDefined(partnerSocketId, 'partnerSocketId is not defined');

      if (banDuration !== BanDuration.NO_BAN) {
        socketStore.socket?.emit('ban-user', {
          partnerUserId,
          partnerSocketId,
          banDuration,
        });
      }
    },
    [callStore.partnerSocketId, callStore.partnerUserId, socketStore.socket],
  );

  const onReportClick = useCallback(() => {
    const partnerUserId = callStore.partnerUserId;
    const partnerSocketId = callStore.partnerSocketId;
    Assert.isDefined(partnerUserId, 'partnerUserId is not defined');
    Assert.isDefined(partnerSocketId, 'partnerSocketId is not defined');

    reportUser(
      {
        reporterId: authStore.userId,
        toReportId: partnerUserId,
      },
      {
        onSuccess: handleReportSuccess,
        onSettled: () => {
          setDialogOpen(false);
          callStore.endCall();
        },
      },
    );
  }, [callStore, reportUser, authStore.userId, handleReportSuccess]);

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
