import { useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { RoutePath } from '@/RoutePath';
import { CallLocation } from '@/features/call/queue/model/CallLocationState';
import { PermissionsDialog } from '../component/PermissionsDialog';
import { FindMatchButton } from '../component/FindMatchButton';
import { useMediaPermissions } from '../hooks/useMediaPermissions';

export const FindMatchContainer = observer(function FindMatchContainer() {
  const { socketStore } = useRootStore();
  const navigate = useNavigate();
  const {
    startingMedia,
    permissionDialogOpen,
    waitingForPermission,
    checkAndRequestMedia,
    requestMediaPermissions,
  } = useMediaPermissions();

  const handleFindMatch = async () => {
    // TODO: requestMediaPermissions func should call this
    const { success } = await checkAndRequestMedia();

    if (success) {
      const routerState: CallLocation = {
        state: {
          findMatch: true,
        },
      };
      navigate(RoutePath.CALL, routerState);
    }
  };

  return (
    <>
      <FindMatchButton
        onClick={handleFindMatch}
        startingMedia={startingMedia}
        connecting={!socketStore.connected}
      />

      <PermissionsDialog
        open={permissionDialogOpen}
        isLoading={waitingForPermission}
        onClick={requestMediaPermissions}
      />
    </>
  );
});
