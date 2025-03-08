import { useState } from 'react';
import { Assert } from '@mono/common-dto';
import { showToast } from '@/common/utils/toast/showToast';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { FindMatchService } from '../service/FindMatchService';

export const useMediaPermissions = () => {
  const { mediaStore } = useRootStore();
  const [startingMedia, setStartingMedia] = useState(false);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [waitingForPermission, setWaitingForPermission] = useState(false);

  const checkAndRequestMedia = async () => {
    setStartingMedia(true);
    const granted = await FindMatchService.getMediaPermissions();

    if (!granted) {
      setPermissionDialogOpen(true);
      setStartingMedia(false);
      return { success: false };
    }

    const { stream, errorState } =
      await FindMatchService.requestAudioAndVideoStream();

    if (errorState) {
      showToast(errorState);
      setStartingMedia(false);
      return { success: false };
    } else {
      Assert.isDefined(
        stream,
        'Unknown error: stream is undefined from FindMatchService.requestAudioAndVideoStream()',
      );
      mediaStore.setLocalStream(stream);
    }

    setStartingMedia(false);
    return { success: true };
  };

  const requestMediaPermissions = async () => {
    setWaitingForPermission(true);
    const result = await FindMatchService.requestAudioAndVideoStream();
    setWaitingForPermission(false);
    setPermissionDialogOpen(false);

    if (result.errorState) {
      showToast(result.errorState);
      return false;
    }

    return true;
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
