import { useEffect, useState } from 'react';

export const useIsPortraitVideoOrientation = (
  videoRef?: React.RefObject<HTMLVideoElement>,
) => {
  const [isPortrait, setIsPortrait] = useState(true);

  useEffect(() => {
    const videoElement = videoRef?.current;

    if (!videoElement) return;

    const handleLoadedMetadata = () => {
      const { videoWidth, videoHeight } = videoElement;
      setIsPortrait(videoHeight > videoWidth);
    };

    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [videoRef]);

  return isPortrait;
};
