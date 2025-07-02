import { observer } from 'mobx-react';
import clsx from 'clsx';
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
    <div className="relative flex justify-center items-center w-full h-full">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        controls={false}
        preload="none"
        muted={isLocal}
        aria-label={`${isLocal ? 'Your video' : "Partner's video"}`}
        data-testid={isLocal ? 'local-video-element' : 'remote-video-element'}
        className={clsx(
          'object-contain',
          isLocal ? 'z-10' : 'z-0',
          isPortrait ? 'aspect-4/3' : 'aspect-video', // aspect-video is 16/9
          isPortrait
            ? 'h-full w-auto max-w-full' // Portrait: fill height, maintain aspect ratio
            : 'w-full h-auto max-h-full', // Landscape: fill width, maintain aspect ratio
        )}
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
