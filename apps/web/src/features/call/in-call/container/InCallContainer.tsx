import { observer } from 'mobx-react';
import clsx from 'clsx';
import { FeatureFlagUtil } from '@/common/utils/FeatureFlagUtil';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { ReportContainer } from '@/features/content-moderation/container/ReportContainer';
import { GameInitiatorContainer } from '@/features/game/game-invite/container/GameInitiatorContainer';
import { useCallStore } from '../../context/useCallStore';
import { Video } from '../component/Video';
import { useVideoStreams } from '../hooks/useVideoStreams';
import { useVideoAspectRatio } from '../hooks/useVideoAspectRatio';
import { useCallActions } from '../hooks/useCallActions';
import { CallActionContainer } from './CallActionContainer';
import { RemoteVideoStreamContainer } from './RemoteVideoStreamContainer';

export const InCallContainer = observer(function InCallPage() {
  const rootStore = useRootStore();
  const { mediaStore, authStore, socketStore, contentModerationStore } =
    rootStore;
  const callStore = useCallStore();
  const { endCall } = useCallActions(socketStore, callStore, mediaStore);

  const isGameEnabled = FeatureFlagUtil.isGamesEnabled();
  const { localVideoRef, remoteVideoRef } = useVideoStreams({
    localStream: mediaStore.localCallStream,
    remoteStream: callStore.remoteStream,
  });

  const { isPortrait, isSquare, shouldUseObjectCover } =
    useVideoAspectRatio(localVideoRef);

  return (
    <>
      <ReportContainer />

      <div
        className={clsx(
          'absolute top-4 right-4 rounded-lg overflow-hidden shadow-lg',
          isSquare
            ? 'w-[20vw] max-w-32 min-w-20 aspect-square' // Square videos
            : isPortrait
              ? 'w-[15vw] max-w-24 min-w-16 aspect-[3/4]' // Portrait videos (taller)
              : 'w-[25vw] max-w-48 min-w-32 aspect-video', // Landscape videos (16:9)
        )}
      >
        <Video
          videoRef={localVideoRef}
          videoEnabled={mediaStore.localVideoEnabled}
          isLocal
        />
      </div>

      <RemoteVideoStreamContainer
        remoteVideoRef={remoteVideoRef}
        remoteVideoEnabled={callStore.remoteVideoEnabled}
        shouldUseObjectCover={shouldUseObjectCover}
        contentModerationEnabled={contentModerationStore.config.enabled}
        modelStatus={contentModerationStore.modelStatus}
        onEndCall={endCall}
      />

      <CallActionContainer />

      {isGameEnabled && (
        <GameInitiatorContainer
          userId={authStore.userId}
          gameActive={callStore.gameActive}
          setGameActive={callStore.setGameActive}
        />
      )}
    </>
  );
});
