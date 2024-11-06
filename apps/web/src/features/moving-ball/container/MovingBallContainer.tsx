import { useEffect } from 'react';
import { observer } from 'mobx-react';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { AudioAnalyserService } from '../service/AudioAnalyserService';
import { CanvasContainer } from './CanvasContainer';

export const MovingBallContainer = observer(function MovingBallContainer() {
  const { mediaStore } = useRootStore();

  useEffect(() => {
    if (mediaStore.maybeStream) {
      AudioAnalyserService.init(mediaStore.maybeStream);
    }

    return () => {
      AudioAnalyserService.stop();
    };
  }, [mediaStore.maybeStream]);

  return <CanvasContainer />;
});
