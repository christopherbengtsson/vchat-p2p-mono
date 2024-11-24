import { observer } from 'mobx-react';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { InviteAlertDialogContainer } from './InviteAlertDialogContainer';
import { StartGameAlertDialogContainer } from './StartGameAlertDialogContainer';
import { InGameContainer } from './InGameContainer';

export const FlyingBallContainer = observer(function FlyingBallContainer() {
  const { gameStore } = useRootStore();

  return (
    <>
      {gameStore.gameActive ? (
        <InGameContainer
          localCanvasAudioStream={gameStore.localCanvasAudioStream}
          remoteCanvasStream={gameStore.remoteCanvasStream}
        />
      ) : (
        <InviteAlertDialogContainer />
      )}
      <StartGameAlertDialogContainer />
    </>
  );
});
