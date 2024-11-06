import { useState } from 'react';
import { observer } from 'mobx-react';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { PromtState } from '@/common/model/PromptState';
import { PermissionsDialog } from '../../components/permissons-dialog/PermissionsDialog';

export const DialogsContainer = observer(function DialogsContainer() {
  const { uiStore, mediaStore } = useRootStore();
  const [loading, setLoading] = useState(false);

  const requestMedia = async () => {
    setLoading(true);
    await mediaStore.requestAudioAndVideoStream();
    setLoading(false);
  };

  switch (uiStore.promptState) {
    case PromtState.PERMISSIONS:
      return (
        <PermissionsDialog
          open={uiStore.promptState === PromtState.PERMISSIONS}
          isLoading={loading}
          onClick={requestMedia}
        />
      );
    default:
      return null;
  }
});
