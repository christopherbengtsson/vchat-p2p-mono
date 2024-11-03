import { observer } from 'mobx-react';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { useMainVideoStream } from '../hooks/useMainVideoStream';
import { BackgroundOverlay } from '../component/BackgroundOverlay';
import { FullScreenVideo } from '../component/FullScreenVideo';

export const FullScreenVideoContainer = observer(
  function FullScreenVideoContainer() {
    const { callStore } = useRootStore();
    const videoRef = useMainVideoStream();

    return (
      <>
        <FullScreenVideo inCall={callStore.inCall} videoRef={videoRef} />
        <BackgroundOverlay inCall={callStore.inCall} />
      </>
    );
  },
);
