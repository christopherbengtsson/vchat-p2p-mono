import { PropsWithChildren, useState } from 'react';
import { useNavigate } from 'react-router';
import { observer } from 'mobx-react';
import { LoadingSpinner } from '@/common/components/loading-spinner/LoadingSpinner';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { ReportButton } from '../component/ReportButton';
import { ReportDialog } from '../component/ReportDialog';
import { useReportUser } from '../hooks/useReportUser';
import { useCallStore } from '../../call/context/useCallStore';

interface Props {
  buttonText?: string;
  ButtonComponent?: React.ComponentType<
    PropsWithChildren<{
      onClick: VoidFunction;
    }>
  >;
  noConfirmation?: boolean;
  doOnSettled?: VoidFunction;
}

export const ReportContainer = observer(function ReportContainer({
  buttonText,
  ButtonComponent,
  noConfirmation,
  doOnSettled,
}: Props) {
  // TODO: Ban user with reason, e.g. harassment, spam, etc.
  const [dialogOpen, setDialogOpen] = useState(false);

  const { authStore, socketStore } = useRootStore();
  const callStore = useCallStore();

  const navigate = useNavigate();

  const { isReporting, onReportClick } = useReportUser({
    maybeSocketId: socketStore.maybeId,
    socket: socketStore.socket,
    roomId: callStore.roomId,
    reporterUserId: authStore.userId,
    partnerUserId: callStore.partnerUserId,
    partnerSocketId: callStore.partnerSocketId,
    navigate,
    doOnSettled: noConfirmation
      ? () => doOnSettled?.()
      : () => {
          setDialogOpen(false);
        },
  });

  const onOpen = () => {
    setDialogOpen(true);
  };

  const onCancel = () => {
    if (!isReporting) {
      setDialogOpen(false);
    }
  };

  return (
    <>
      {ButtonComponent ? (
        <ButtonComponent onClick={onReportClick}>
          <>
            {isReporting && <LoadingSpinner />}
            {buttonText || 'Report user'}
          </>
        </ButtonComponent>
      ) : (
        <ReportButton onClick={onOpen} />
      )}

      {!noConfirmation && (
        <ReportDialog
          open={dialogOpen}
          onCancel={onCancel}
          onReport={onReportClick}
          isLoading={isReporting}
        />
      )}
    </>
  );
});
