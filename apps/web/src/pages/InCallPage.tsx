import { useEffect, useRef } from 'react';
import { observer } from 'mobx-react';
import { EndCallButton } from '@/components/EndCallButton';
import { ToggleCameraButton } from '@/components/ToggleCameraButton';
import { ToggleMuteButton } from '@/components/ToggleMuteButton';
import { Video } from '@/components/Video';
import { useMainStore } from '../stores/MainStoreContext';

export const InCallPage = observer(function InCallPage() {
  const mainStore = useMainStore();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = mainStore.secondaryMediaStream;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = mainStore.mainMediaStream;
    }
  }, [mainStore.mainMediaStream, mainStore.secondaryMediaStream]);

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
          videoEnabled={mainStore.remoteVideoEnabled}
        />
      </div>

      <div className="absolute top-4 right-4 w-1/3 h-1/4 rounded-lg overflow-hidden shadow-lg">
        <Video
          videoRef={localVideoRef}
          videoEnabled={mainStore.localVideoEnabled}
          isLocal
        />
      </div>

      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-4">
        <ToggleCameraButton
          localStream={mainStore.secondaryMediaStream}
          videoEnabled={mainStore.localVideoEnabled}
          onToggle={toggleVideo}
        />
        <ToggleMuteButton
          localStream={mainStore.secondaryMediaStream}
          audioEnabled={mainStore.localAudioEnabled}
          onToggle={toggleAudio}
        />
        <EndCallButton onClick={() => mainStore.leaveRoom()} />
      </div>
    </div>
  );
});
