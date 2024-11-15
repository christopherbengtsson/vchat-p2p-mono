import { useEffect, useRef } from 'react';
import { observer } from 'mobx-react';
import { CanvasContainer } from './CanvasContainer';

interface Props {
  localAudioStream: MediaStream | null;
  remoteCanvasStream: MediaStream | null;
}

export const MovingBallContainer = observer(function MovingBallContainer({
  localAudioStream,
  remoteCanvasStream,
}: Props) {
  const remoteCanvasStreamRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoElement = remoteCanvasStreamRef.current;
    if (videoElement && remoteCanvasStream) {
      videoElement.srcObject = remoteCanvasStream;
    }
  }, [remoteCanvasStream]);

  if (localAudioStream) {
    return <CanvasContainer />;
  }

  return (
    <div className="absolute top-0 left-0 w-full h-full">
      <div className="relative w-full h-full flex justify-center items-center">
        <video
          id="canvas-video-stream"
          ref={remoteCanvasStreamRef}
          autoPlay
          playsInline
          muted
          className="absolute top-4 left-4 w-1/3 h-1/4 rounded-lg overflow-hidden shadow-lg"
        />
      </div>
    </div>
  );
});
