import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react';
import { showToast } from '@/common/utils/toast/showToast';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { PermissionsDialog } from '../component/PermissionsDialog';
import { FindMatchButton } from '../component/FindMatchButton';

export const FindMatchContainer = observer(function FindMatchContainer() {
  const { socketStore, callStore, mediaStore } = useRootStore();
  const navigate = useNavigate();

  const [startingMedia, setStartingMedia] = useState(false);

  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [waitingForPermission, setWaitingForPermission] = useState(false);

  const findMatch = async () => {
    setStartingMedia(true);
    const granted = await mediaStore.getMediaPermissions();

    if (!granted) {
      setPermissionDialogOpen(true);
      setStartingMedia(false);
      return;
    }

    const error = await mediaStore.requestAudioAndVideoStream();

    setStartingMedia(false);

    if (error) {
      showToast(error);
    }

    callStore.findMatch();
    navigate('/call');
  };

  const requestMedia = async () => {
    setWaitingForPermission(true);
    const error = await mediaStore.requestAudioAndVideoStream();
    setWaitingForPermission(false);

    setPermissionDialogOpen(false);

    if (error) {
      showToast(error);
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
