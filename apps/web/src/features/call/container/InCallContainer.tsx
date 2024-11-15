import { useCallback, useEffect, useRef } from 'react';
import { observer } from 'mobx-react';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { Video } from '../component/Video';
import { EndCallButton } from '../component/EndCallButton';
import { ToggleCameraButton } from '../component/ToggleCameraButton';
import { ToggleMuteButton } from '../component/ToggleMuteButton';
import { MovingBallContainer } from '../../moving-ball/container/MovingBallContainer';
import { GameInviteButton } from '../component/GameInviteButton';

export const InCallContainer = observer(function InCallPage() {
  const { mediaStore, callStore, socketStore } = useRootStore();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = mediaStore.stream;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = callStore.remoteStream;
    }
  }, [callStore.remoteStream, mediaStore.stream]);

  useEffect(() => {
    socketStore.maybeSocket?.on('send-game-invite', () => {
      socketStore.maybeSocket?.emit(
        'answer-game-invite',
        callStore.roomId,
        true,
      );
    });

    return () => {
      socketStore.maybeSocket?.off('send-game-invite');
    };
  }, [callStore.roomId, socketStore.maybeSocket]);

  useEffect(() => {
    socketStore.maybeSocket?.on('answer-game-invite', (accept) => {
      if (accept) {
        callStore.startGameLocally();
      }
    });

    return () => {
      socketStore.maybeSocket?.off('send-game-invite');
    };
  }, [callStore, callStore.roomId, socketStore.maybeSocket]);

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
    <div className="relative w-full h-screen bg-main">
      <div className="absolute inset-0">
        <Video
          videoRef={remoteVideoRef}
          videoEnabled={callStore.remoteVideoEnabled}
        />
      </div>

      <div className="absolute top-4 right-4 w-1/3 h-1/4 rounded-lg overflow-hidden shadow-lg">
        <Video
          videoRef={localVideoRef}
          videoEnabled={mediaStore.videoEnabled}
          isLocal
        />
      </div>

      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-4">
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

      {(callStore.localCanvasAudioStream || callStore.remoteCanvasStream) && (
        <MovingBallContainer
          localAudioStream={callStore.localCanvasAudioStream}
          remoteCanvasStream={callStore.remoteCanvasStream}
        />
      )}
    </div>
  );
});
