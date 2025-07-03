import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { observer } from 'mobx-react';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { RoutePath } from '@/RoutePath';
import { CallLocation } from '@/features/call/queue/model/CallLocationState';
import { PermissionsDialog } from '../component/PermissionsDialog';
import { FindMatchButton } from '../component/FindMatchButton';
import { useMediaPermissions } from '../hooks/useMediaPermissions';

const FIND_MATCH_ROUTER_STATE: CallLocation = {
  state: {
    findMatch: true,
  },
};

export const FindMatchContainer = observer(function FindMatchContainer() {
  const [userClicked, setUserClicked] = useState(false);

  const navigate = useNavigate();

  const { socketStore, contentModerationStore } = useRootStore();
  const {
    startingMedia,
    permissionDialogOpen,
    waitingForPermission,
    checkAndRequestMedia,
    requestMediaPermissions,
  } = useMediaPermissions();

  const navigateToCall = useCallback(() => {
    navigate(RoutePath.CALL, FIND_MATCH_ROUTER_STATE);
  }, [navigate]);

  const handleFindMatch = useCallback(async () => {
    setUserClicked(true);

    const { success } = await checkAndRequestMedia();

    if (success) {
      navigateToCall();
    }
  }, [checkAndRequestMedia, navigateToCall]);

  const handlePermissionRequest = useCallback(async () => {
    return await requestMediaPermissions(navigateToCall);
  }, [requestMediaPermissions, navigateToCall]);

  return (
    <>
      <FindMatchButton
        onClick={handleFindMatch}
        startingMedia={startingMedia}
        connecting={!socketStore.connected}
        modelStatus={contentModerationStore.modelStatus}
        showLoadingState={userClicked}
      />

      <PermissionsDialog
        open={permissionDialogOpen}
        isLoading={waitingForPermission}
        onClick={handlePermissionRequest}
      />
    </>
  );
});
