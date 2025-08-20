import { useEffect } from 'react';

const toggleRemoveVideoContainer = (visible: boolean) => {
  const videoElement: HTMLVideoElement | null = document.querySelector(
    '[data-testid="remote-video-element"]',
  );

  if (videoElement) {
    videoElement.style.display = visible ? 'block' : 'none';
  }
};

export const useToggleRemoteVideoElement = () => {
  useEffect(() => {
    toggleRemoveVideoContainer(false);

    return () => {
      toggleRemoveVideoContainer(true);
    };
  }, []);
};
