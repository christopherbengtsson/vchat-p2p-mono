import { AnalysisResult } from '../model/AnalysisResult';
import { NSFWModelService } from './NSFWModelService';

const analyzeImage = async (
  imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  threshold: number,
): Promise<AnalysisResult> => {
  try {
    const topTwoGuesses = 2;
    const predictions = await NSFWModelService.get().classify(
      imageElement,
      topTwoGuesses,
    );

    const nsfwCategories = ['Porn', 'Sexy'];
    const nsfwPredictions = predictions.filter((p) =>
      nsfwCategories.includes(p.className),
    );

    const highestNSFWProbability =
      nsfwPredictions.length > 0
        ? Math.max(...nsfwPredictions.map((p) => p.probability))
        : 0;

    const isNSFW = highestNSFWProbability > threshold;

    return {
      predictions,
      nsfw: isNSFW,
      highestNSFWProbability,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('Error analyzing image:', error);
    throw error;
  }
};

const captureVideoFrame = (() => {
  const canvas = document.createElement('canvas');
  let lastWidth = 0;
  let lastHeight = 0;

  const scale = navigator.hardwareConcurrency <= 4 ? 0.5 : 1.0;

  return (videoElement: HTMLVideoElement): HTMLCanvasElement => {
    const targetWidth = Math.round(videoElement.videoWidth * scale);
    const targetHeight = Math.round(videoElement.videoHeight * scale);

    if (lastWidth !== targetWidth || lastHeight !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      lastWidth = targetWidth;
      lastHeight = targetHeight;
    }

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoElement, 0, 0, targetWidth, targetHeight);
    }

    return canvas;
  };
})();

export const ContentModerationService = {
  analyzeImage,
  captureVideoFrame,
};
