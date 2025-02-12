import { useCallback } from 'react';
import { observer } from 'mobx-react';
import { toast } from 'sonner';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { cn } from '@/common/lib/utils';
import { FeatureFlagUtil } from '@/common/utils/FeatureFlagUtil';
import { IS_DARK_MODE } from '@/common/utils/isDarkMode';
import { ToggleCameraButton } from '../component/ToggleCameraButton';
import { ToggleMuteButton } from '../component/ToggleMuteButton';
import { EndCallButton } from '../component/EndCallButton';
import { GameInviteButton } from '../component/GameInviteButton';

export const CallActionContainer = observer(function CallActionContainer() {
  const { callStore, mediaStore, gameStore } = useRootStore();
  const isGameEnabled = FeatureFlagUtil.isGamesEnabled();

  const toggleVideo = useCallback(() => {
    const toggle = !mediaStore.videoEnabled;
    gameStore.sendMessage({
      type: 'VIDEO_TOGGLE',
      toggle,
    });
    mediaStore.setVideoEnabled(toggle);
  }, [gameStore, mediaStore]);

  const toggleAudio = useCallback(() => {
    const toggle = !mediaStore.audioEnabled;
    mediaStore.setAudioEnabled(toggle);
    gameStore.sendMessage({
      type: 'AUDIO_TOGGLE',
      toggle,
    });
  }, [gameStore, mediaStore]);

  const handleCanvasStream = useCallback(() => {
    gameStore.invitePartnerToGame();
    toast.success('Invitation to game sent!');
  }, [gameStore]);

  const endCall = useCallback(() => {
    callStore.endCall();
  }, [callStore]);

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
        <GameInviteButton
          gameActive={gameStore.gameActive}
          onToggle={handleCanvasStream}
        />
      )}
    </div>
  );
});
