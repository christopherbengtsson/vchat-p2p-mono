import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react';
import { showToast } from '@/common/utils/toast/showToast';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { RoutePath } from '@/RoutePath';
import { CallLocation } from '@/features/call/queue/model/CallLocationState';
import { PermissionsDialog } from '../component/PermissionsDialog';
import { FindMatchButton } from '../component/FindMatchButton';
import { FindMatchService } from '../service/FindMatchService';

export const FindMatchContainer = observer(function FindMatchContainer() {
  const { socketStore, mediaStore } = useRootStore();
  const navigate = useNavigate();

  const [startingMedia, setStartingMedia] = useState(false);

  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [waitingForPermission, setWaitingForPermission] = useState(false);

  const findMatch = async () => {
    setStartingMedia(true);
    const granted = await FindMatchService.getMediaPermissions();

    if (!granted) {
      setPermissionDialogOpen(true);
      setStartingMedia(false);
      return;
    }

    const { stream, errorState } =
      await FindMatchService.requestAudioAndVideoStream();

    if (errorState) {
      showToast(errorState);
    } else {
      mediaStore.setLocalStream(stream);
    }

    setStartingMedia(false);

    const routerState: CallLocation = {
      state: {
        findMatch: true,
      },
    };
    navigate(RoutePath.CALL, routerState);
  };

  const requestMedia = async () => {
    setWaitingForPermission(true);
    const { errorState } = await FindMatchService.requestAudioAndVideoStream();
    setWaitingForPermission(false);

    setPermissionDialogOpen(false);

    if (errorState) {
      showToast(errorState);
    }
  };

  return (
    <>
      <FindMatchButton
        onClick={findMatch}
        startingMedia={startingMedia}
        connecting={!socketStore.connected}
      />

      <PermissionsDialog
        open={permissionDialogOpen}
        isLoading={waitingForPermission}
        onClick={requestMedia}
      />
    </>
  );
});
