import { useCallback, useState } from 'react';
import { when } from 'mobx';
import type { ContentModerationStore } from '@/stores/ContentModerationStore';

export const useContentModerationAvailability = (
  contentModerationStore: ContentModerationStore,
) => {
  const [contentModerationDialogOpen, setContentModerationDialogOpen] =
    useState(false);

  const checkContentModerationAvailability = useCallback(async (): Promise<{
    contentModerationAvailable: boolean;
  }> => {
    if (contentModerationStore.modelStatus === 'loading') {
      await when(() => contentModerationStore.modelStatus !== 'loading');
    }

    if (contentModerationStore.modelStatus === 'error') {
      setContentModerationDialogOpen(true);
      return { contentModerationAvailable: false };
    }

    return { contentModerationAvailable: true };
  }, [contentModerationStore.modelStatus]);

  const handleContentModerationContinue = useCallback(
    (onContinue: () => void) => {
      setContentModerationDialogOpen(false);
      onContinue();
    },
    [],
  );

  const handleContentModerationCancel = useCallback(() => {
    setContentModerationDialogOpen(false);
  }, []);

  return {
    contentModerationDialogOpen,
    checkContentModerationAvailability,
    handleContentModerationContinue,
    handleContentModerationCancel,
  };
};
