import { useEffect, useRef } from 'react';
import { observer } from 'mobx-react';
import { SpectatorVideo } from '../component/SpectatorVideo';

interface Props {
  remoteCanvasStream: MediaStream;
}

export const SpectatorContainer = observer(function SpectatorContainer({
  remoteCanvasStream,
}: Props) {
  const remoteCanvasStreamRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoElement = remoteCanvasStreamRef.current;
    if (videoElement && remoteCanvasStream) {
      videoElement.srcObject = remoteCanvasStream;
    }
  }, [remoteCanvasStream]);

  return <SpectatorVideo remoteCanvasStreamRef={remoteCanvasStreamRef} />;
});
