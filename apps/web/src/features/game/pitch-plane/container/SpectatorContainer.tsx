import { useEffect, useRef } from 'react';
import { Maybe } from '@mono/common-dto';
import { SpectatorVideo } from '../component/SpectatorVideo';

interface Props {
  remoteCanvasStream: Maybe<MediaStream>;
}

export function SpectatorContainer({ remoteCanvasStream }: Props) {
  const remoteCanvasStreamRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoElement = remoteCanvasStreamRef.current;
    if (videoElement && remoteCanvasStream) {
      videoElement.srcObject = remoteCanvasStream;
    }
  }, [remoteCanvasStream]);

  return <SpectatorVideo remoteCanvasStreamRef={remoteCanvasStreamRef} />;
}
