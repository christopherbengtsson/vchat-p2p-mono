import { useEffect, useRef } from 'react';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { CallState } from '@/stores/model/CallState';

export const useMainVideoStream = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { mediaStore, callStore } = useRootStore();

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject =
        callStore.callState === CallState.IN_CALL
          ? callStore.remoteStream
          : mediaStore.maybeStream;
    }
  }, [callStore.callState, callStore.remoteStream, mediaStore.maybeStream]);

  return videoRef;
};
