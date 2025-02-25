import { useEffect, useRef } from 'react';

interface In {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

export const useInjectVideoSource = ({ localStream, remoteStream }: In) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [localStream, remoteStream]);

  return { localVideoRef, remoteVideoRef };
};
