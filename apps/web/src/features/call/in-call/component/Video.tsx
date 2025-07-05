import { observer } from 'mobx-react';
import clsx from 'clsx';
import { BsCameraVideoOff } from 'react-icons/bs';
import { TypographyP } from '@/common/components/typography/Typography';

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isLocal?: boolean;
  videoEnabled: boolean;
  shouldUseObjectCover?: boolean;
  className?: string;
}

export const Video = observer(function Video({
  videoRef,
  isLocal,
  videoEnabled,
  className,
  shouldUseObjectCover = false,
}: Props) {
  return (
    <div
      className={clsx('relative flex justify-center items-center', className)}
    >
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
          'w-full h-full',
          shouldUseObjectCover ? 'object-cover' : 'object-contain',
          isLocal ? 'z-10' : 'z-0',
        )}
      />

      {!videoEnabled && (
        <div
          className={clsx(
            'absolute inset-0 flex items-center justify-center',
            isLocal ? 'z-10 shadow-video-off' : 'z-0',
          )}
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
