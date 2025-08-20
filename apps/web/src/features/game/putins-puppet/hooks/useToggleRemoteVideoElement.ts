import { useEffect, useRef } from 'react';

const toggleRemoveVideoContainer = (
  visible: boolean,
  videoElement: HTMLVideoElement | null,
) => {
  if (videoElement && videoElement.style) {
    videoElement.style.display = visible ? 'block' : 'none';
  }
};

export const useToggleRemoteVideoElement = () => {
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!videoElementRef.current) {
      videoElementRef.current = document.querySelector(
        '[data-testid="remote-video-element"]',
      );
    }

    toggleRemoveVideoContainer(false, videoElementRef.current);

    return () => {
      toggleRemoveVideoContainer(true, videoElementRef.current);
    };
  }, []);
};
