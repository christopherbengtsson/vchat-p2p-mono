import { useCallback, useEffect, useRef } from 'react';
import { Maybe } from '@mono/common-dto';
import { NSFWModelStatus } from '@/stores/model/NSFWModelStatus';
import { ContentModerationService } from '../service/ContentModerationService';

interface In {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoEnabled: boolean;
  nsfwEnabled: boolean;
  modelStatus: NSFWModelStatus;
  intervalMs: number;
  detectionThreshold: number;
  remoteStreamNSFW: boolean;
  ignoreDetectedNSFW: boolean;
  handleNSFWDetection: (result: {
    probability: number;
    timestamp: number;
  }) => void;
}

export const useNSFWDetection = ({
  videoRef,
  videoEnabled,
  nsfwEnabled,
  modelStatus,
  intervalMs,
  detectionThreshold,
  remoteStreamNSFW,
  ignoreDetectedNSFW,
  handleNSFWDetection,
}: In): void => {
  const intervalRef = useRef<Maybe<NodeJS.Timeout>>(null);

  const analyzeFrame = useCallback(async () => {
    const video = videoRef.current;

    if (
      !video ||
      !videoEnabled ||
      !nsfwEnabled ||
      modelStatus !== 'ready' ||
      ignoreDetectedNSFW ||
      remoteStreamNSFW
    ) {
      return;
    }

    try {
      const canvas = ContentModerationService.captureVideoFrame(video);
      const result = await ContentModerationService.analyzeImage(
        canvas,
        detectionThreshold,
      );

      if (result.nsfw) {
        handleNSFWDetection({
          probability: result.highestNSFWProbability,
          timestamp: result.timestamp,
        });
      }
    } catch (err) {
      console.error('NSFW detection error:', err);
    }
  }, [
    videoRef,
    videoEnabled,
    nsfwEnabled,
    modelStatus,
    ignoreDetectedNSFW,
    remoteStreamNSFW,
    detectionThreshold,
    handleNSFWDetection,
  ]);

  useEffect(() => {
    if (
      !videoRef.current ||
      !videoEnabled ||
      !nsfwEnabled ||
      modelStatus !== 'ready' ||
      ignoreDetectedNSFW ||
      remoteStreamNSFW
    ) {
      return;
    }

    intervalRef.current = setInterval(analyzeFrame, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [
    analyzeFrame,
    intervalMs,
    videoEnabled,
    videoRef,
    ignoreDetectedNSFW,
    remoteStreamNSFW,
    modelStatus,
    nsfwEnabled,
  ]);
};
