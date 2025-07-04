import type { Dimensions } from '../model/VideoAspectRatio';

/** Threshold for considering aspect ratio differences */
const ASPECT_RATIO_THRESHOLD = 0.2;
const RESIZE_DEBOUNCE_MS = 100;

const getViewportDimensions = (): Dimensions => {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
};

const getVideoDimensions = (videoElement: HTMLVideoElement): Dimensions => {
  return {
    width: videoElement.videoWidth,
    height: videoElement.videoHeight,
  };
};

const calculateAspectRatio = (width: number, height: number): number => {
  return width / height;
};

const calculateAspectRatioDifference = (
  videoAspectRatio: number,
  containerAspectRatio: number,
): number => {
  return Math.abs(videoAspectRatio - containerAspectRatio);
};

export const VideoAspectUtil = {
  ASPECT_RATIO_THRESHOLD,
  RESIZE_DEBOUNCE_MS,
  getViewportDimensions,
  getVideoDimensions,
  calculateAspectRatio,
  calculateAspectRatioDifference,
};
