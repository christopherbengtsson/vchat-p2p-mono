import { observer } from 'mobx-react';
import { FeatureFlagUtil } from '@/common/utils/FeatureFlagUtil';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { ReportContainer } from '@/features/user-report/container/ReportContainer';
import { GameInitiatorContainer } from '@/features/game/game-invite/container/GameInitiatorContainer';
import { useCallStore } from '../../context/useCallStore';
import { useVideoStreams } from '../hooks/useVideoStreams';
import { UserVideoContainer } from './UserVideoContainer';
import { CallActionContainer } from './CallActionContainer';

export const InCallContainer = observer(function InCallPage() {
  const { mediaStore, authStore } = useRootStore();
  const callStore = useCallStore();
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

      <UserVideoContainer
        videoRef={remoteVideoRef}
        videoEnabled={callStore.remoteVideoEnabled}
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
