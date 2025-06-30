import { observer } from 'mobx-react';
import { NSFWModelStatus } from '@/stores/model/NSFWModelStatus';
import { NSFWOverlayContainer } from '../content-moderation/container/NSFWOverlayContainer';
import { UserVideoContainer } from './UserVideoContainer';

interface Props {
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoEnabled: boolean;
  onEndCall: VoidFunction;
  modelStatus: NSFWModelStatus;
}

export const RemoteVideoStreamContainer = observer(
  ({ remoteVideoRef, remoteVideoEnabled, modelStatus, onEndCall }: Props) => {
    return (
      <>
        {modelStatus === 'ready' && (
          <NSFWOverlayContainer
            videoRef={remoteVideoRef}
            videoEnabled={remoteVideoEnabled}
            onEndCall={onEndCall}
          />
        )}

        <UserVideoContainer
          videoRef={remoteVideoRef}
          videoEnabled={remoteVideoEnabled}
        />
      </>
    );
  },
);
