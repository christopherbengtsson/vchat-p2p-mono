import { observer } from 'mobx-react';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { cn } from '@/common/lib/utils';
import { FeatureFlagUtil } from '@/common/utils/FeatureFlagUtil';
import { IS_DARK_MODE } from '@/common/utils/isDarkMode';
import { GameInviteActionContainer } from '@/features/game/game-invite/container/GameInviteActionContainer';
import { useCallStore } from '../../context/useCallStore';
import { ToggleCameraButton } from '../component/ToggleCameraButton';
import { ToggleMuteButton } from '../component/ToggleMuteButton';
import { EndCallButton } from '../component/EndCallButton';
import { useCallActions } from '../hooks/useCallActions';

export const CallActionContainer = observer(function CallActionContainer() {
  const { mediaStore, socketStore, authStore } = useRootStore();
  const callStore = useCallStore();
  const isGameEnabled = FeatureFlagUtil.isGamesEnabled();
  const { toggleAudio, toggleVideo, endCall } = useCallActions(
    socketStore,
    callStore,
    mediaStore,
  );

  return (
    <div
      className={cn(
        'absolute left-1/2 transform -translate-x-1/2 flex space-x-4 z-50',
        IS_DARK_MODE
          ? 'bottom-8'
          : 'bottom-0 bg-muted-foreground p-10 pb-4 pt-4 rounded-t-lg',
      )}
    >
      <ToggleCameraButton
        localStream={mediaStore.stream}
        videoEnabled={mediaStore.videoEnabled}
        onToggle={toggleVideo}
      />
      <ToggleMuteButton
        localStream={mediaStore.stream}
        audioEnabled={mediaStore.audioEnabled}
        onToggle={toggleAudio}
      />
      <EndCallButton onClick={endCall} />

      {isGameEnabled && (
        <GameInviteActionContainer
          userId={authStore.userId}
          gameActive={callStore.gameActive}
        />
      )}
    </div>
  );
});
