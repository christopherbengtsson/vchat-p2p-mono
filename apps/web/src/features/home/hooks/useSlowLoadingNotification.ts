import { useEffect, useState } from 'react';
import { FindMatchLoadingState } from '../model/FindMatchLoadingState';

const SHOW__MODERATION_MESSAGE_DELAY = 5000;

export const useSlowLoadingNotification = (
  loadingState: FindMatchLoadingState,
) => {
  const [showModerationMessage, setShowModerationMessage] = useState(false);

  useEffect(() => {
    if (loadingState === 'contentModeration') {
      const timer = setTimeout(() => {
        setShowModerationMessage(true);
      }, SHOW__MODERATION_MESSAGE_DELAY);

      return () => {
        clearTimeout(timer);
        setShowModerationMessage(false);
      };
    } else {
      setShowModerationMessage(false);
    }
  }, [loadingState]);

  return showModerationMessage;
};
