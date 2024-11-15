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
  const containerRef = useRef<HTMLDivElement>(null);
  const remoteCanvasStreamRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoElement = remoteCanvasStreamRef.current;
    if (videoElement && remoteCanvasStream) {
      videoElement.srcObject = remoteCanvasStream;
    }
  }, [remoteCanvasStream]);

  useEffect(() => {
    const videoElement = remoteCanvasStreamRef.current;
    const container = containerRef.current;
    if (!videoElement || !container) return;

    const handleResize = () => {
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      const isPortrait = window.innerHeight > window.innerWidth;
      let videoWidth = containerWidth;
      let videoHeight = containerHeight;

      if (isPortrait) {
        // Adjust video size for portrait orientation
        videoHeight = containerHeight;
        videoWidth = (videoHeight * 9) / 16; // Assuming 16:9 aspect ratio
        if (videoWidth > containerWidth) {
          videoWidth = containerWidth;
          videoHeight = (videoWidth * 16) / 9;
        }
      } else {
        // Adjust video size for landscape orientation
        videoWidth = containerWidth;
        videoHeight = (videoWidth * 9) / 16;
        if (videoHeight > containerHeight) {
          videoHeight = containerHeight;
          videoWidth = (videoHeight * 16) / 9;
        }
      }

      videoElement.style.width = `${videoWidth}px`;
      videoElement.style.height = `${videoHeight}px`;
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    handleResize(); // Initial size

    window.addEventListener('orientationchange', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  if (localAudioStream) {
    return <CanvasContainer />;
  }

  return (
    <div ref={containerRef} className="absolute top-0 left-0 w-full h-full">
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
