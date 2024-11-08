import { useEffect } from 'react';
import { observer } from 'mobx-react';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { AudioAnalyserService } from '../service/AudioAnalyserService';
import { CanvasContainer } from './CanvasContainer';

export const MovingBallContainer = observer(function MovingBallContainer() {
  const { mediaStore } = useRootStore();

  useEffect(() => {
    let analyserStream: MediaStream;

    const getAnalyserStream = async () => {
      try {
        analyserStream = await mediaStore.requestGameAudioStream();
        AudioAnalyserService.init(analyserStream);
      } catch (error) {
        console.error('Error accessing microphone for audio analysis:', error);
      }
    };

    getAnalyserStream();

    return () => {
      AudioAnalyserService.stop();
      if (analyserStream) {
        analyserStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [mediaStore]);

  return <CanvasContainer />;
});
