import { useMemo } from 'react';
import { observer } from 'mobx-react';
import { Button } from '@/common/components/ui/button';
import { LoadingSpinner } from '@/common/components/loading-spinner/LoadingSpinner';
import { NSFWModelStatus } from '@/stores/model/NSFWModelStatus';

interface Props {
  onClick: VoidFunction;
  connecting: boolean;
  startingMedia: boolean;
  modelStatus: NSFWModelStatus;
  showLoadingState: boolean;
}

export const FindMatchButton = observer(function FindMatchButton({
  onClick,
  connecting,
  startingMedia,
  modelStatus,
  showLoadingState,
}: Props) {
  const loading = useMemo(
    () => showLoadingState && modelStatus === 'loading',
    [showLoadingState, modelStatus],
  );

  return (
    <>
      <Button
        className="w-full"
        onClick={onClick}
        disabled={connecting || startingMedia || loading}
      >
        {connecting || startingMedia || loading ? (
          <>
            <LoadingSpinner />
            {connecting
              ? 'Connecting...'
              : startingMedia
                ? 'Starting camera...'
                : 'Loading...'}
          </>
        ) : (
          'Find match'
        )}
      </Button>
    </>
  );
});
