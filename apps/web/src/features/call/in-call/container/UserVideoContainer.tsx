import { observer } from 'mobx-react';
import { useIsPortraitVideoOrientation } from '@/common/hooks/useIsPortraitVideoOrientation';
import { Video } from '../component/Video';

interface Props {
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  isLocal?: boolean;
  videoEnabled: boolean;
}

export const UserVideoContainer = observer(function UserVideoContainer({
  videoRef,
  ...props
}: Props) {
  const isPortrait = useIsPortraitVideoOrientation(videoRef);

  return <Video videoRef={videoRef} {...props} isPortrait={isPortrait} />;
});
