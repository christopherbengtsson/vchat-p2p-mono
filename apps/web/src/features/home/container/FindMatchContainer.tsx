import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { observer } from 'mobx-react';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { RoutePath } from '@/RoutePath';
import { CallLocation } from '@/features/call/queue/model/CallLocationState';
import { TypographyP } from '@/common/components/typography/Typography';
import { PermissionsDialog } from '../component/PermissionsDialog';
import { FindMatchButton } from '../component/FindMatchButton';
import { useMediaPermissions } from '../hooks/useMediaPermissions';
import { ContentModerationUnavailableDialog } from '../../content-moderation/component/ContentModerationUnavailableDialog';
import { useContentModerationAvailability } from '../../content-moderation/hooks/useContentModerationAvailability';
import { FindMatchLoadingState } from '../model/FindMatchLoadingState';
import { useFetchUser } from '../hooks/useFetchUser';
import { Button } from '../../../common/components/ui/button';

const FIND_MATCH_ROUTER_STATE: CallLocation = {
  state: {
    findMatch: true,
  },
};

export const FindMatchContainer = observer(function FindMatchContainer() {
  const [loadingState, setLoadingState] =
    useState<FindMatchLoadingState>('idle');

  const navigate = useNavigate();
  const { isPending, isError } = useFetchUser();

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

  const vidRef = useRef<HTMLVideoElement>(null);
  const [_st, setSt] = useState<MediaStream | null>(null);
  return (
    <>
      <FindMatchButton
        onClick={handleFindMatch}
        startingMedia={startingMedia}
        connecting={!socketStore.connected}
        loadingState={isPending ? 'fetchingUser' : loadingState}
        disabled={isError}
      />

      <Button
        onClick={() => {
          navigator.mediaDevices
            .getUserMedia({ video: true, audio: true })
            .then((stream) => {
              setSt(stream);

              if (vidRef.current) {
                vidRef.current.srcObject = stream;
              }

              console.log('Got stream:', stream);
            })
            .catch((err) => {
              console.error('getUserMedia failed:', err.name, err.message);
              alert(
                `name: ${err.name}\nmessage: ${err.message}\ncode: ${err.code ?? 'n/a'}`,
              );
            });
        }}
      >
        Debug media
      </Button>
      <video ref={vidRef} autoPlay muted playsInline></video>

      {isError && (
        <TypographyP className="text-sm text-destructive text-center">
          Could not fetch user information. Please try refreshing the page.
        </TypographyP>
      )}

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
