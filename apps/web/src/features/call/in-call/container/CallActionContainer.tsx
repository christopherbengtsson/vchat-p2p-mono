import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react';
import { toast } from 'sonner';
import { WebRTCService } from '@mono/fe-webrtc';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { cn } from '@/common/lib/utils';
import { FeatureFlagUtil } from '@/common/utils/FeatureFlagUtil';
import { RouterStateUtil } from '@/common/utils/RouterStateUtil';
import { IS_DARK_MODE } from '@/common/utils/isDarkMode';
import { useCallStore } from '../../context/useCallStore';
import { ToggleCameraButton } from '../component/ToggleCameraButton';
import { ToggleMuteButton } from '../component/ToggleMuteButton';
import { EndCallButton } from '../component/EndCallButton';
import { GameInviteButton } from '../component/GameInviteButton';
import { InCallService } from '../service/InCallService';

export const CallActionContainer = observer(function CallActionContainer() {
  const { mediaStore, socketStore } = useRootStore();
  const callStore = useCallStore();
  const isGameEnabled = FeatureFlagUtil.isGamesEnabled();

  const navigate = useNavigate();

  const toggleVideo = useCallback(() => {
    const toggle = !mediaStore.videoEnabled;
    WebRTCService.get()?.sendMessage({
      type: 'VIDEO_TOGGLE',
      toggle,
    });
    mediaStore.setVideoEnabled(toggle);
  }, [mediaStore]);

  const toggleAudio = useCallback(() => {
    const toggle = !mediaStore.audioEnabled;
    mediaStore.setAudioEnabled(toggle);
    WebRTCService.get()?.sendMessage({
      type: 'AUDIO_TOGGLE',
      toggle,
    });
  }, [mediaStore]);

  const handleCanvasStream = useCallback(() => {
    callStore.gameStore.invitePartnerToGame();
    toast.success('Invitation to game sent!');
  }, [callStore.gameStore]);

  const endCall = useCallback(() => {
    RouterStateUtil.clear();

    InCallService.endCall(
      socketStore.socket,
      callStore.roomId,
      socketStore.id,
      navigate,
    );
  }, [callStore.roomId, navigate, socketStore]);

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
          gameActive={callStore.gameStore.gameActive}
          onToggle={handleCanvasStream}
        />
      )}
    </div>
  );
});
