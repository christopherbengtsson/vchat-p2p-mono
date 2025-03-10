import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
    const toggle = !mediaStore.localVideoEnabled;
    WebRTCService.get()?.sendMessage({
      type: 'VIDEO_TOGGLE',
      toggle,
    });
    mediaStore.setLocalVideoEnabled(toggle);
  }, [mediaStore]);

  const toggleAudio = useCallback(() => {
    const toggle = !mediaStore.localAudioEnabled;
    mediaStore.setLocalAudioEnabled(toggle);
    WebRTCService.get()?.sendMessage({
      type: 'AUDIO_TOGGLE',
      toggle,
    });
  }, [mediaStore]);

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
    endCall,
  };
};
