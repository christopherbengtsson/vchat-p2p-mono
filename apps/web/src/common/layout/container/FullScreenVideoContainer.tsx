import { observer } from 'mobx-react';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { CallState } from '@/stores/model/CallState';
import { useMainVideoStream } from '../hooks/useMainVideoStream';
import { BackgroundOverlay } from '../component/BackgroundOverlay';
import { FullScreenVideo } from '../component/FullScreenVideo';

export const FullScreenVideoContainer = observer(
  function FullScreenVideoContainer() {
    const { callStore } = useRootStore();
    const videoRef = useMainVideoStream();

    return (
      <>
        <FullScreenVideo
          inCall={callStore.callState === CallState.IN_CALL}
          videoRef={videoRef}
        />
        <BackgroundOverlay inCall={callStore.callState === CallState.IN_CALL} />
      </>
    );
  },
);
