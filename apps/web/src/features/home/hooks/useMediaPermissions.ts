import { useState } from 'react';
import { Assert } from '@mono/common-dto';
import { showToast } from '@/common/utils/toast/showToast';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { FindMatchService } from '../service/FindMatchService';

interface MediaRequestResult {
  success: boolean;
}

export const useMediaPermissions = () => {
  const { mediaStore } = useRootStore();
  const [startingMedia, setStartingMedia] = useState(false);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [waitingForPermission, setWaitingForPermission] = useState(false);

  const handleMediaStreamRequest = async (
    showLoading = false,
  ): Promise<MediaRequestResult> => {
    if (showLoading) {
      setWaitingForPermission(true);
    }

    const { stream, errorState } =
      await FindMatchService.requestAudioAndVideoStream();

    if (showLoading) {
      setWaitingForPermission(false);
    }

    if (errorState) {
      showToast(errorState);
      return { success: false };
    }

    Assert.isDefined(
      stream,
      'Unknown error: stream is undefined from FindMatchService.requestAudioAndVideoStream()',
    );

    mediaStore.setLocalStream(stream);
    return { success: true };
  };

  const checkAndRequestMedia = async (): Promise<MediaRequestResult> => {
    setStartingMedia(true);
    const granted = await FindMatchService.getMediaPermissions();

    if (!granted) {
      setPermissionDialogOpen(true);
      setStartingMedia(false);
      return { success: false };
    }

    const result = await handleMediaStreamRequest();
    setStartingMedia(false);
    return result;
  };

  const requestMediaPermissions = async (
    onSuccess?: () => void,
  ): Promise<boolean> => {
    const result = await handleMediaStreamRequest(true);
    setPermissionDialogOpen(false);

    if (result.success && onSuccess) {
      onSuccess();
    }

    return result.success;
  };

  return {
    startingMedia,
    permissionDialogOpen,
    waitingForPermission,
    checkAndRequestMedia,
    requestMediaPermissions,
    closePermissionDialog: () => setPermissionDialogOpen(false),
  };
};
