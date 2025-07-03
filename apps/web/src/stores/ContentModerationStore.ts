import { action, observable } from 'mobx';
import { ContentModerationConfig } from '../features/call/in-call/content-moderation/model/ContentModerationConfig';
import type { NSFWModelStatus } from './model/NSFWModelStatus';

export class ContentModerationStore {
  @observable accessor config: ContentModerationConfig = {
    enabled: import.meta.env.VITE_NSFW_ENABLED !== 'false',
    threshold: parseFloat(import.meta.env.VITE_NSFW_THRESHOLD) || 0.8,
    analysisIntervalMs: 2000,
  };

  @observable accessor modelStatus: NSFWModelStatus = 'loading';
  @observable accessor remoteStreamNSFW = false;
  @observable accessor remoteNSFWProbability = 0;
  @observable accessor ignoreDetectedNSFW = false;
  @observable accessor lastNSFWDetection = 0;

  constructor() {
    const isLowEndDevice = navigator.hardwareConcurrency <= 2;

    if (isLowEndDevice) {
      this.setConfig({ analysisIntervalMs: 4000 });
    }
  }

  @action
  setModelStatus = (status: NSFWModelStatus): void => {
    this.modelStatus = status;
  };

  @action
  setConfig = (config: Partial<ContentModerationConfig>): void => {
    this.config = { ...this.config, ...config };
  };

  @action
  handleNSFWDetection = (result: {
    probability: number;
    timestamp: number;
  }): void => {
    this.remoteStreamNSFW = true;
    this.remoteNSFWProbability = result.probability;
    this.lastNSFWDetection = result.timestamp;
  };

  @action
  resetNSFWState = (): void => {
    this.remoteStreamNSFW = false;
    this.remoteNSFWProbability = 0;
  };

  @action
  setIgnoreDetectedNSFW = (ignored: boolean): void => {
    this.ignoreDetectedNSFW = ignored;
    this.resetNSFWState();
  };
}

export const contentModerationStore = new ContentModerationStore();
