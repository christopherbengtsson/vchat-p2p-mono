import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { WebRTCService } from '@mono/fe-webrtc';
import { RouterStateUtil } from '@/common/utils/RouterStateUtil';
import { SocketStore } from '@/stores/SocketStore';
import { MediaStore } from '@/stores/MediaStore';
import { InCallService } from '../service/InCallService';
import { CallStore } from '../../store/CallStore';

export const useCallActions = (
  socketStore: SocketStore,
  callStore: CallStore,
  mediaStore: MediaStore,
) => {
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

  return {
    toggleVideo,
    toggleAudio,
    handleCanvasStream,
    endCall,
  };
};
