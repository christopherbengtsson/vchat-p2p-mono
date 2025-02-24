import { useIsPortraitVideoOrientation } from '@/common/hooks/useIsPortraitVideoOrientation';
import { Video } from './Video';

interface Props {
  videoRef?: React.RefObject<HTMLVideoElement>;
  isLocal?: boolean;
  videoEnabled: boolean;
}

export function UserVideoContainer({ videoRef, ...props }: Props) {
  const isPortrait = useIsPortraitVideoOrientation(videoRef);

  return <Video videoRef={videoRef} {...props} isPortrait={isPortrait} />;
}
