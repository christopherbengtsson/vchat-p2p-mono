import { observer } from 'mobx-react';
import { BsCameraVideoOff } from 'react-icons/bs';

interface Props {
  videoRef?: React.RefObject<HTMLVideoElement>;
  isLocal?: boolean;
  videoEnabled: boolean;
}

export const Video = observer(function Video({
  videoRef,
  isLocal,
  videoEnabled,
}: Props) {
  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        className={`w-full h-full object-cover ${isLocal ? 'z-10' : 'z-0'}`}
        autoPlay
        playsInline
        muted={isLocal}
      />

      {!videoEnabled && (
        <div className="absolute inset-0 flex items-center justify-center bg-opacity-75 bg-noice">
          <BsCameraVideoOff className="text-white text-4xl" />
          <p className="text-white ml-2">
            {isLocal ? 'Your' : "Partner's"} camera is off
          </p>
        </div>
      )}
    </div>
  );
});
