import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { observer } from 'mobx-react';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { RoutePath } from '@/RoutePath';
import { CallLocation } from '@/features/call/queue/model/CallLocationState';
import { PermissionsDialog } from '../component/PermissionsDialog';
import { FindMatchButton } from '../component/FindMatchButton';
import { useMediaPermissions } from '../hooks/useMediaPermissions';
import { ContentModerationUnavailableDialog } from '../../content-moderation/component/ContentModerationUnavailableDialog';
import { useContentModerationAvailability } from '../../content-moderation/hooks/useContentModerationAvailability';

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

  const {
    contentModerationDialogOpen,
    checkContentModerationAvailability,
    handleContentModerationContinue,
    handleContentModerationCancel,
  } = useContentModerationAvailability(contentModerationStore);

  const navigateToCall = useCallback(() => {
    navigate(RoutePath.CALL, FIND_MATCH_ROUTER_STATE);
  }, [navigate]);

  const proceedToMediaCheck = useCallback(async () => {
    const { success } = await checkAndRequestMedia();

    if (success) {
      navigateToCall();
    } else {
      setUserClicked(false);
    }
  }, [checkAndRequestMedia, navigateToCall]);

  const handleFindMatch = useCallback(async () => {
    setUserClicked(true);

    const { contentModerationAvailable } =
      await checkContentModerationAvailability();

    if (contentModerationAvailable) {
      await proceedToMediaCheck();
    }
  }, [checkContentModerationAvailability, proceedToMediaCheck]);

  const handlePermissionRequest = useCallback(async () => {
    return await requestMediaPermissions(navigateToCall);
  }, [requestMediaPermissions, navigateToCall]);

  const handleContentModerationContinueClick = useCallback(() => {
    handleContentModerationContinue(proceedToMediaCheck);
  }, [handleContentModerationContinue, proceedToMediaCheck]);

  const handleContentModerationCancelClick = useCallback(() => {
    handleContentModerationCancel();
    setUserClicked(false);
  }, [handleContentModerationCancel]);

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

      <ContentModerationUnavailableDialog
        open={contentModerationDialogOpen}
        onContinue={handleContentModerationContinueClick}
        onCancel={handleContentModerationCancelClick}
      />
    </>
  );
});
