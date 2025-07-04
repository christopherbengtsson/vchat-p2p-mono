export interface AspectRatioClassification {
  aspectRatio: number;
  isPortrait: boolean;
  isSquare: boolean;
  isUltraWide: boolean;
}

export interface AspectRatioCssClasses {
  aspectRatioClass: string;
  containerClass: string;
}

export interface VideoAspectRatioData
  extends AspectRatioClassification,
    AspectRatioCssClasses {
  shouldUseObjectCover: boolean;
}

export interface Dimensions {
  width: number;
  height: number;
}
