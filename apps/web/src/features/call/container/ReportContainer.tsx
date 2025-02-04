import { useCallback, useState } from 'react';
import { observer } from 'mobx-react';
import type { PostgrestSingleResponse } from '@supabase/supabase-js';
import { ReportButton } from '../component/ReportButton';
import { ReportDialog } from '../component/ReportDialog';
import { useReportUser } from '../hooks/useReportUser';
import { useRootStore } from '../../../stores/hooks/useRootStore';
import { Assert } from '../../../common/utils/Assert';
import { DeviceSignatureUtil } from '../../../common/utils/DeviceSignatureUtil';

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
    (response: PostgrestSingleResponse<number>) => {
      const partnerUserId = callStore.partnerUserId;
      const partnerSocketId = callStore.partnerSocketId;
      Assert.isDefined(partnerUserId, 'partnerUserId is not defined');
      Assert.isDefined(partnerSocketId, 'partnerSocketId is not defined');

      const banDuration = response?.data ?? 0;
      if (banDuration > 0) {
        socketStore.socket?.emit('user-banned', {
          partnerUserId,
          partnerSocketId,
          banDuration,
          deviceSignature: DeviceSignatureUtil.get(),
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
