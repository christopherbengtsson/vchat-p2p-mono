import { observer } from 'mobx-react';
import { FeatureFlagUtil } from '@/common/utils/FeatureFlagUtil';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { ReportContainer } from '@/features/user-report/container/ReportContainer';
import { GameInitiatorContainer } from '@/features/game/game-invite/container/GameInitiatorContainer';
import { useCallStore } from '../../context/useCallStore';
import { useVideoStreams } from '../hooks/useVideoStreams';
import { useCallActions } from '../hooks/useCallActions';
import { UserVideoContainer } from './UserVideoContainer';
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

  return (
    <>
      <ReportContainer />

      <div className="absolute top-4 right-4 w-auto h-auto max-w-32 md:max-w-64 rounded-lg overflow-hidden shadow-lg">
        <UserVideoContainer
          videoRef={localVideoRef}
          videoEnabled={mediaStore.localVideoEnabled}
          isLocal
        />
      </div>

      <RemoteVideoStreamContainer
        remoteVideoRef={remoteVideoRef}
        remoteVideoEnabled={callStore.remoteVideoEnabled}
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
