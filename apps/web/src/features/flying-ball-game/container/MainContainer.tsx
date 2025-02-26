import { observer } from 'mobx-react';
import { useCallStore } from '../../call/context/useCallStore';
import { InGameContainer } from './InGameContainer';
import { StartGameAlertDialogContainer } from './StartGameAlertDialogContainer';
import { InviteAlertDialogContainer } from './InviteAlertDialogContainer';

export const MainContainer = observer(function MainContainer() {
  const { gameStore } = useCallStore();

  if (gameStore.gameActive) {
    <>
      <InGameContainer
        localCanvasAudioStream={gameStore.localCanvasAudioStream}
        remoteCanvasStream={gameStore.remoteCanvasStream}
      />
      <StartGameAlertDialogContainer />
    </>;
  }

  return <InviteAlertDialogContainer />;
});
