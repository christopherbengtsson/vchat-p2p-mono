import { observer } from 'mobx-react';
import { NSFWModelStatus } from '@/stores/model/NSFWModelStatus';
import { Video } from '../component/Video';
import { NSFWOverlayContainer } from '../../../content-moderation/container/NSFWOverlayContainer';

interface Props {
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoEnabled: boolean;
  onEndCall: VoidFunction;
  modelStatus: NSFWModelStatus;
  contentModerationEnabled: boolean;
  shouldUseObjectCover: boolean;
}

export const RemoteVideoStreamContainer = observer(
  ({
    remoteVideoRef,
    remoteVideoEnabled,
    modelStatus,
    onEndCall,
    contentModerationEnabled,
    shouldUseObjectCover,
  }: Props) => {
    return (
      <>
        {modelStatus === 'ready' && contentModerationEnabled && (
          <NSFWOverlayContainer
            videoRef={remoteVideoRef}
            videoEnabled={remoteVideoEnabled}
            onEndCall={onEndCall}
          />
        )}

        <Video
          videoRef={remoteVideoRef}
          videoEnabled={remoteVideoEnabled}
          className="w-full h-full"
          shouldUseObjectCover={shouldUseObjectCover}
        />
      </>
    );
  },
);
