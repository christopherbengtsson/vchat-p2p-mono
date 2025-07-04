import { useCallback, useEffect, useState, useMemo } from 'react';
import type { VideoAspectRatioData } from '../model/VideoAspectRatio';
import { VideoAspectService } from '../service/VideoAspectService';
import { VideoAspectUtil } from '../util/VideoAspectUtil';

const initialState: VideoAspectRatioData = {
  aspectRatio: 0.75, // Default to 4:3 portrait
  isPortrait: true,
  isSquare: false,
  isUltraWide: false,
  aspectRatioClass: 'aspect-[3/4]',
  containerClass: 'h-full w-auto max-w-full',
  shouldUseObjectCover: false,
};

export const useVideoAspectRatio = (
  videoRef?: React.RefObject<HTMLVideoElement | null>,
): VideoAspectRatioData => {
  const [aspectRatioData, setAspectRatioData] =
    useState<VideoAspectRatioData>(initialState);

  const calculateAspectRatio = useCallback(() => {
    if (!videoRef?.current) return;

    const videoElement = videoRef.current;

    const calculatedData =
      VideoAspectService.calculateFromVideoElement(videoElement);

    setAspectRatioData((prevData) => ({
      ...prevData,
      ...calculatedData,
    }));
  }, [videoRef]);

  const handleLoadedMetadata = useCallback(() => {
    calculateAspectRatio();
  }, [calculateAspectRatio]);

  const debouncedCalculateAspectRatio = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(
        calculateAspectRatio,
        VideoAspectUtil.RESIZE_DEBOUNCE_MS,
      );
    };
  }, [calculateAspectRatio]);

  useEffect(() => {
    const videoElement = videoRef?.current;

    if (!videoElement) return;

    if (videoElement.readyState >= 1) {
      calculateAspectRatio();
    }

    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    addEventListener('resize', debouncedCalculateAspectRatio);

    return () => {
      if (videoElement) {
        videoElement.removeEventListener(
          'loadedmetadata',
          handleLoadedMetadata,
        );
      }

      removeEventListener('resize', debouncedCalculateAspectRatio);
    };
  }, [
    calculateAspectRatio,
    handleLoadedMetadata,
    videoRef,
    debouncedCalculateAspectRatio,
  ]);

  return aspectRatioData;
};
