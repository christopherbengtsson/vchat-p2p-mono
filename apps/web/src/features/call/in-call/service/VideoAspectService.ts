import type {
  AspectRatioClassification,
  AspectRatioCssClasses,
  VideoAspectRatioData,
  Dimensions,
} from '../model/VideoAspectRatio';
import { VideoAspectUtil } from '../util/VideoAspectUtil';

const classifyAspectRatio = (
  aspectRatio: number,
): AspectRatioClassification => {
  const isPortrait = aspectRatio < 1.2;
  const isSquare = aspectRatio >= 0.9 && aspectRatio <= 1.1;
  const isUltraWide = aspectRatio > 2.0;

  return {
    aspectRatio,
    isPortrait,
    isSquare,
    isUltraWide,
  };
};

const generateCssClasses = (
  classification: AspectRatioClassification,
): AspectRatioCssClasses => {
  const { aspectRatio, isSquare, isPortrait, isUltraWide } = classification;

  let aspectRatioClass: string;
  let containerClass: string;

  if (isSquare) {
    aspectRatioClass = 'aspect-square';
    containerClass = 'w-full h-full';
  } else if (isPortrait) {
    if (aspectRatio <= 0.6) {
      // Very tall portrait (like 9:16)
      aspectRatioClass = 'aspect-[9/16]';
      containerClass = 'h-full w-auto max-w-full';
    } else if (aspectRatio <= 0.8) {
      // Standard portrait (like 3:4)
      aspectRatioClass = 'aspect-[3/4]';
      containerClass = 'h-full w-auto max-w-full';
    } else {
      // Portrait-ish (like 4:5)
      aspectRatioClass = 'aspect-[4/5]';
      containerClass = 'h-full w-auto max-w-full';
    }
  } else if (isUltraWide) {
    // Ultra-wide landscape
    aspectRatioClass = 'aspect-[21/9]';
    containerClass = 'w-full h-auto max-h-full';
  } else {
    // Standard landscape
    if (aspectRatio >= 1.7) {
      // Wide landscape (like 16:9)
      aspectRatioClass = 'aspect-video';
      containerClass = 'w-full h-auto max-h-full';
    } else {
      // Standard landscape (like 4:3)
      aspectRatioClass = 'aspect-4/3';
      containerClass = 'w-full h-auto max-h-full';
    }
  }

  return {
    aspectRatioClass,
    containerClass,
  };
};

const shouldUseObjectCover = (
  videoAspectRatio: number,
  containerAspectRatio: number,
): boolean => {
  const difference = VideoAspectUtil.calculateAspectRatioDifference(
    videoAspectRatio,
    containerAspectRatio,
  );
  return difference < VideoAspectUtil.ASPECT_RATIO_THRESHOLD;
};

const calculateVideoAspectRatioData = (
  videoDimensions: Dimensions,
  containerDimensions: Dimensions,
): VideoAspectRatioData => {
  const videoAspectRatio = VideoAspectUtil.calculateAspectRatio(
    videoDimensions.width,
    videoDimensions.height,
  );

  const containerAspectRatio = VideoAspectUtil.calculateAspectRatio(
    containerDimensions.width,
    containerDimensions.height,
  );

  const classification = classifyAspectRatio(videoAspectRatio);

  const cssClasses = generateCssClasses(classification);

  const useObjectCover = shouldUseObjectCover(
    videoAspectRatio,
    containerAspectRatio,
  );

  return {
    ...classification,
    ...cssClasses,
    shouldUseObjectCover: useObjectCover,
  };
};

const calculateFromVideoElement = (
  videoElement: HTMLVideoElement,
): VideoAspectRatioData => {
  const videoDimensions = VideoAspectUtil.getVideoDimensions(videoElement);
  const containerDimensions = VideoAspectUtil.getViewportDimensions();

  return calculateVideoAspectRatioData(videoDimensions, containerDimensions);
};

export const VideoAspectService = {
  classifyAspectRatio,
  generateCssClasses,
  shouldUseObjectCover,
  calculateVideoAspectRatioData,
  calculateFromVideoElement,
};
