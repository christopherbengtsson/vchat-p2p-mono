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
        'absolute left-1/2 transform -translate-x-1/2 flex space-x-4 py-2 px-4 backdrop-blur-sm z-50',
        IS_DARK_MODE
          ? 'bottom-8 bg-background/50 rounded-sm'
          : 'bottom-0 bg-muted-foreground/50 rounded-t-sm',
      )}
    >
      <ToggleCameraButton
        localStream={mediaStore.localCallStream}
        videoEnabled={mediaStore.localVideoEnabled}
        onToggle={toggleVideo}
      />
      <ToggleMuteButton
        localStream={mediaStore.localCallStream}
        audioEnabled={mediaStore.localAudioEnabled}
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
