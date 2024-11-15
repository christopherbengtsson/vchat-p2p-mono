import { observer } from 'mobx-react';
import { useRootStore } from '../../../stores/hooks/useRootStore';
import { SpectatorContainer } from './SpectatorContainer';
import { PlayerContainer } from './PlayerContainer';

export const MovingBallContainer = observer(function MovingBallContainer() {
  const { callStore } = useRootStore();

  if (callStore.remoteCanvasStream) {
    return (
      <SpectatorContainer remoteCanvasStream={callStore.remoteCanvasStream} />
    );
  }

  if (callStore.localCanvasAudioStream) {
    return <PlayerContainer />;
  }

  return null;
});
