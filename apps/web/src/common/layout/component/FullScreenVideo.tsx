import { observer } from 'mobx-react';

interface Props {
  videoRef: React.RefObject<HTMLVideoElement>;
  inCall: boolean;
}

export const FullScreenVideo = observer(function FullScreenVideo({
  videoRef,
  inCall,
}: Props) {
  return (
    <video
      ref={videoRef}
      className="absolute top-0 left-0 w-full h-full object-cover"
      autoPlay
      playsInline
      muted={!inCall}
    />
  );
});
