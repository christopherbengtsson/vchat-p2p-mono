import { useEffect, useState } from 'react';

export const useIsPortraitVideoOrientation = (
  videoRef?: React.RefObject<HTMLVideoElement | null>,
) => {
  const [isPortrait, setIsPortrait] = useState(true);

  useEffect(() => {
    const videoElement = videoRef?.current;

    if (!videoElement) return;

    const handleLoadedMetadata = () => {
      const { videoWidth, videoHeight } = videoElement;

      // More precise aspect ratio detection
      const aspectRatio = videoWidth / videoHeight;

      // Consider portrait if aspect ratio < 1.2 (accounts for 4:3 ≈ 1.33 being "portrait-ish" for video calls)
      // Standard portrait is < 1.0, but 4:3 (1.33) is closer to portrait than 16:9 (1.78)
      setIsPortrait(aspectRatio < 1.2);
    };

    // Check immediately if metadata is already loaded
    if (videoElement.readyState >= 1) {
      handleLoadedMetadata();
    }

    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [videoRef]);

  return isPortrait;
};
