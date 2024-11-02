import { useEffect, useRef } from 'react';
import { useRootStore } from '@/stores/hooks/useRootStore';

export const useMainVideoStream = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { mediaStore, callStore } = useRootStore();

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = callStore.inCall
        ? callStore.remoteStream
        : mediaStore.maybeStream;
    }
  }, [callStore.inCall, callStore.remoteStream, mediaStore.maybeStream]);

  return videoRef;
};
