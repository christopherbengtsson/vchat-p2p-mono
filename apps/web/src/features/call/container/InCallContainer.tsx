import { useEffect, useRef } from 'react';
import { observer } from 'mobx-react';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { FlyingBallContainer } from '../../flying-ball-game/container/FlyingBallContainer';
import { CallActionContainer } from './CallActionContainer';
import { UserVideoContainer } from './UserVideoContainer';

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

  return (
    <>
      <UserVideoContainer
        videoRef={remoteVideoRef}
        videoEnabled={callStore.remoteVideoEnabled}
      />

      <FlyingBallContainer />

      <div className="absolute top-4 right-4 w-auto h-auto max-w-32 rounded-lg overflow-hidden shadow-lg">
        <UserVideoContainer
          videoRef={localVideoRef}
          videoEnabled={mediaStore.videoEnabled}
          isLocal
        />
      </div>

      <CallActionContainer />
    </>
  );
});
