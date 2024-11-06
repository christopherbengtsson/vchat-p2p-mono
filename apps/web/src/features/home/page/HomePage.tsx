import { useCallback, useEffect, useState } from 'react';
import { observer } from 'mobx-react';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { SettingsMenuContainer } from '../container/SettingsMenuContainer';
import { FindMatchButton } from '../component/FindMatchButton';
import { ConnectionCountContainer } from '../container/ConnectionCountContainer';
import { AudioContextService } from '../../audio-context/service/AudioContextService';

interface VolumeVisualizerProps {
  volume: number;
}

export const VolumeVisualizer: React.FC<VolumeVisualizerProps> = ({
  volume,
}) => {
  // Clamp the volume to a maximum value to avoid excessive scaling
  const clampedVolume = Math.min(volume, 1);

  return (
    <div className="w-full flex flex-col justify-center items-center align-center mt-4">
      <div className="w-64 h-4 bg-gray-300 rounded">
        <div
          className="h-full bg-green-500 rounded"
          style={{
            width: `${clampedVolume * 100}%`,
            transition: 'width 0.1s ease-out',
          }}
        ></div>
      </div>
      <span className="ml-2">{(clampedVolume * 100).toFixed(0)}%</span>
    </div>
  );
};

export const HomePage = observer(function StartPage() {
  const { socketStore, callStore, mediaStore } = useRootStore();

  const [vol, setVol] = useState(0);

  const handleVolume = useCallback((volume: number) => {
    setVol(volume);
  }, []);

  useEffect(() => {
    if (mediaStore.maybeStream) {
      AudioContextService.init(mediaStore.maybeStream, handleVolume);
    }
  }, [handleVolume, mediaStore.maybeStream]);

  const connectOrFindMatch = useCallback(async () => {
    callStore.findMatch();
  }, [callStore]);

  return (
    <>
      <SettingsMenuContainer />

      <div className="w-full max-w-sm flex flex-col items-center gap-4">
        <FindMatchButton
          connectOrFindMatch={connectOrFindMatch}
          connected={socketStore.connected}
        />

        <ConnectionCountContainer />

        <VolumeVisualizer volume={vol} />

        <div className="w-full flex flex-col items-center gap-2"></div>
      </div>
    </>
  );
});
