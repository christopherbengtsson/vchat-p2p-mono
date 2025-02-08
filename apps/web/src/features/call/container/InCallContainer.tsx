import { useEffect, useRef } from 'react';
import { observer } from 'mobx-react';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { ReportContainer } from '@/features/user-report/container/ReportContainer';
import { FlyingBallContainer } from '@/features/flying-ball-game/container/FlyingBallContainer';
import { FeatureFlagUtil } from '@/common/utils/FeatureFlagUtil';
import { CallActionContainer } from './CallActionContainer';
import { UserVideoContainer } from './UserVideoContainer';

export const InCallContainer = observer(function InCallPage() {
  const { mediaStore, callStore } = useRootStore();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const isGameEnabled = FeatureFlagUtil.isGamesEnabled();

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = mediaStore.stream;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = callStore.remoteStream;
    }
  }, [callStore.remoteStream, mediaStore.stream]);

  return (
    <>
      <ReportContainer />

      <div className="absolute top-4 right-4 w-auto h-auto max-w-32 md:max-w-64 rounded-lg overflow-hidden shadow-lg">
        <UserVideoContainer
          videoRef={localVideoRef}
          videoEnabled={mediaStore.videoEnabled}
          isLocal
        />
      </div>

      <UserVideoContainer
        videoRef={remoteVideoRef}
        videoEnabled={callStore.remoteVideoEnabled}
      />

      <CallActionContainer />
      {isGameEnabled && <FlyingBallContainer />}
    </>
  );
});
