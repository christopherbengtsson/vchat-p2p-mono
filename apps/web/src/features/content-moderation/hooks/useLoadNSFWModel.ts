import { useCallback, useEffect } from 'react';
import { Maybe } from '@mono/common-dto';
import { contentModerationStore } from '@/stores/ContentModerationStore';
import { NSFWModelService } from '../service/NSFWModelService';

export const useLoadNSFWModel = () => {
  const load = useCallback(async () => {
    try {
      const contentModerationConfig = contentModerationStore.config;
      if (contentModerationConfig.enabled) {
        contentModerationStore.setModelStatus('loading');
        await NSFWModelService.load();
      }
      contentModerationStore.setModelStatus('ready');
    } catch {
      contentModerationStore.setModelStatus('error');
    }
  }, []);

  useEffect(() => {
    let idleCallback: Maybe<number>;
    let timeout: Maybe<NodeJS.Timeout>;

    if ('requestIdleCallback' in window) {
      idleCallback = requestIdleCallback(
        () => {
          void load();
        },
        { timeout: 10_000 },
      );
    } else {
      timeout = setTimeout(() => {
        void load();
      }, 100);

      return () => {
        if (idleCallback) {
          cancelIdleCallback(idleCallback);
        }

        if (timeout) {
          clearTimeout(timeout);
        }
      };
    }
  }, [load]);
};
