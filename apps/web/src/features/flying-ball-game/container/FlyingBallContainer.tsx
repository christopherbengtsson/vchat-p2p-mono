import { observer } from 'mobx-react';
import { useCallStore } from '@/features/call/context/useCallStore';
import { InviteAlertDialogContainer } from './InviteAlertDialogContainer';
import { StartGameAlertDialogContainer } from './StartGameAlertDialogContainer';
import { InGameContainer } from './InGameContainer';

export const FlyingBallContainer = observer(function FlyingBallContainer() {
  const { gameStore } = useCallStore();

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
