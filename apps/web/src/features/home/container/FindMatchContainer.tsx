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
import { FindMatchLoadingState } from '../model/FindMatchLoadingState';

const FIND_MATCH_ROUTER_STATE: CallLocation = {
  state: {
    findMatch: true,
  },
};

export const FindMatchContainer = observer(function FindMatchContainer() {
  const [loadingState, setLoadingState] =
    useState<FindMatchLoadingState>('idle');

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
    setLoadingState('mediaCheck');

    const { success } = await checkAndRequestMedia();

    if (success) {
      navigateToCall();
    } else {
      setLoadingState('idle');
    }
  }, [checkAndRequestMedia, navigateToCall]);

  const handleFindMatch = useCallback(async () => {
    setLoadingState('contentModeration');

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
    setLoadingState('idle');
  }, [handleContentModerationCancel]);

  return (
    <>
      <FindMatchButton
        onClick={handleFindMatch}
        startingMedia={startingMedia}
        connecting={!socketStore.connected}
        loadingState={loadingState}
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
