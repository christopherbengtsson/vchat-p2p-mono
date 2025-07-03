import { observer } from 'mobx-react';
import { BsCameraVideoOff } from 'react-icons/bs';
import { TypographyP } from '@/common/components/typography/Typography';

interface Props {
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  isLocal?: boolean;
  videoEnabled: boolean;
  isPortrait: boolean;
}

export const Video = observer(function Video({
  videoRef,
  isLocal,
  videoEnabled,
  isPortrait,
}: Props) {
  return (
    <div className="relative flex justify-center w-full h-full">
      <video
        ref={videoRef}
        className={`${
          isPortrait ? 'w-auto h-full' : 'w-full h-auto'
        } ${isLocal ? 'z-10' : 'z-0'}`}
        data-testid={isLocal ? 'local-video-element' : 'remote-video-element'}
        autoPlay
        playsInline
        aria-label={`${isLocal ? 'Your video' : "Partner's video"}`}
        muted={isLocal}
      />

      {!videoEnabled && (
        <div
          className={`absolute inset-0 flex items-center justify-center ${isLocal ? 'z-10 shadow-video-off' : 'z-0'}`}
        >
          <BsCameraVideoOff
            className={`text-white ${isLocal ? 'text-xl' : 'text-4xl'}`}
            aria-label={
              isLocal ? 'Your camera is off' : "Partner's camera is off icon"
            }
          />
          {!isLocal && (
            <TypographyP className="ml-2 text-white" noFirstMarginTop>
              Partner's camera is off
            </TypographyP>
          )}
        </div>
      )}
    </div>
  );
});
