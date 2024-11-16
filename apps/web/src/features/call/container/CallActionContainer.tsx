import { useCallback } from 'react';
import { observer } from 'mobx-react';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { ToggleCameraButton } from '../component/ToggleCameraButton';
import { ToggleMuteButton } from '../component/ToggleMuteButton';
import { EndCallButton } from '../component/EndCallButton';
import { GameInviteButton } from '../component/GameInviteButton';

export const CallActionContainer = observer(function CallActionContainer() {
  const { callStore, mediaStore } = useRootStore();

  const toggleVideo = useCallback(() => {
    const toggle = !mediaStore.videoEnabled;
    callStore.emitVideoToggle(toggle);
    mediaStore.videoEnabled = toggle;
  }, [callStore, mediaStore]);

  const toggleAudio = useCallback(() => {
    const toggle = !mediaStore.audioEnabled;
    callStore.emitAudioToggle(toggle);
    mediaStore.audioEnabled = toggle;
  }, [callStore, mediaStore]);

  const handleCanvasStream = useCallback(() => {
    /**
     * send invite
     * show toast that invite was sent
     * show alert to receiver to accept/decline (just accept for now)
     * start game
     */
    callStore.inviteToGame();
  }, [callStore]);

  return (
    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-4 z-50">
      <ToggleCameraButton
        localStream={mediaStore.stream}
        videoEnabled={mediaStore.stream.getVideoTracks()[0].enabled}
        onToggle={toggleVideo}
      />
      <ToggleMuteButton
        localStream={mediaStore.stream}
        audioEnabled={mediaStore.audioEnabled}
        onToggle={toggleAudio}
      />
      <EndCallButton onClick={() => callStore.endCall()} />

      <GameInviteButton
        canvasStream={callStore.remoteCanvasStream}
        onToggle={handleCanvasStream}
      />
    </div>
  );
});