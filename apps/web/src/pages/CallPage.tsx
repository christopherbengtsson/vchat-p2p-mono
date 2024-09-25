import { observer } from 'mobx-react';
import { useEffect, useRef } from 'react';
import { useMainStore } from '../stores/MainStoreContext';
import { Video } from '@/components/Video';
import { ToggleMuteButton } from '@/components/ToggleMuteButton';
import { EndCallButton } from '@/components/EndCallButton';
import { ToggleCameraButton } from '@/components/ToggleCameraButton';

export const CallPage = observer(function CallPage() {
  const mainStore = useMainStore();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = mainStore.webRtcStore.localStream;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = mainStore.webRtcStore.remoteStream;
    }
  }, [mainStore.webRtcStore.localStream, mainStore.webRtcStore.remoteStream]);

  const toggleVideo = () => {
    mainStore.toggleVideo();
  };
  const toggleAudio = () => {
    mainStore.toggleAudio();
  };

  return (
    <div className="relative w-full h-screen bg-main">
      <div className="absolute inset-0">
        <Video
          videoRef={remoteVideoRef}
          videoEnabled={mainStore.webRtcStore.remoteVideoEnabled}
        />
      </div>

      <div className="absolute top-4 right-4 w-1/3 h-1/4 rounded-lg overflow-hidden shadow-lg">
        <Video
          videoRef={localVideoRef}
          videoEnabled={mainStore.webRtcStore.localVideoEnabled}
          isLocal
        />
      </div>

      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-4">
        <ToggleCameraButton
          localStream={mainStore.webRtcStore.localStream}
          videoEnabled={mainStore.webRtcStore.localVideoEnabled}
          onToggle={toggleVideo}
        />
        <ToggleMuteButton
          localStream={mainStore.webRtcStore.localStream}
          audioEnabled={mainStore.webRtcStore.localAudioEnabled}
          onToggle={toggleAudio}
        />
        <EndCallButton onClick={() => mainStore.leaveRoom()} />
      </div>
    </div>
  );
});
