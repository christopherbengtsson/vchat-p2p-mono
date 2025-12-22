import { observer } from 'mobx-react';
import { Maybe } from '@mono/common-dto';
import { NSFWModelStatus } from '@/stores/model/NSFWModelStatus';
import { GameState } from '@/features/game/game-engine/model/GameState';
import { Video } from '../component/Video';
import { NSFWOverlayContainer } from '../../../content-moderation/container/NSFWOverlayContainer';

interface Props {
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoEnabled: boolean;
  onEndCall: VoidFunction;
  modelStatus: NSFWModelStatus;
  contentModerationEnabled: boolean;
  shouldUseObjectCover: boolean;
  gameActive: boolean;
  gameState: Maybe<GameState>;
}

export const RemoteVideoStreamContainer = observer(
  ({
    remoteVideoRef,
    remoteVideoEnabled,
    modelStatus,
    onEndCall,
    contentModerationEnabled,
    shouldUseObjectCover,
    gameActive,
    gameState,
  }: Props) => {
    return (
      <>
        {modelStatus === 'ready' && contentModerationEnabled && (
          <NSFWOverlayContainer
            videoRef={remoteVideoRef}
            videoEnabled={remoteVideoEnabled}
            onEndCall={onEndCall}
            gameActive={gameActive}
            gameState={gameState}
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
