import { BsCameraVideoOff } from 'react-icons/bs';

interface Props {
  videoRef?: React.RefObject<HTMLVideoElement>;
  isLocal?: boolean;
  videoEnabled: boolean;
  isPortrait: boolean;
}

export function Video({ videoRef, isLocal, videoEnabled, isPortrait }: Props) {
  return (
    <div className="relative flex justify-center w-full h-full">
      <video
        ref={videoRef}
        className={`${
          isPortrait ? 'w-auto h-full' : 'w-full h-auto'
        } ${isLocal ? 'z-10' : 'z-0'}`}
        autoPlay
        playsInline
        muted={isLocal}
      />

      {!videoEnabled && (
        <div
          className={`absolute inset-0 flex items-center justify-center  bg-opacity-75 bg-transparent ${isLocal ? 'z-10 shadow-video-off' : 'z-0'}`}
        >
          <BsCameraVideoOff
            className={`text-white ${isLocal ? 'text-xl' : 'text-4xl'}`}
          />
          {!isLocal && (
            <p className="text-white ml-2">Partner's camera is off</p>
          )}
        </div>
      )}
    </div>
  );
}
