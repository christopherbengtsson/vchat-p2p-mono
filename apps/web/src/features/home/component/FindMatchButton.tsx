import { observer } from 'mobx-react';
import { Button } from '@/common/components/ui/button';
import { LoadingSpinner } from '@/common/components/loading-spinner/LoadingSpinner';

interface Props {
  onClick: VoidFunction;
  connecting: boolean;
  startingMedia: boolean;
}

export const FindMatchButton = observer(function FindMatchButton({
  onClick,
  connecting,
  startingMedia,
}: Props) {
  return (
    <>
      <Button
        className="w-full"
        onClick={onClick}
        disabled={connecting || startingMedia}
      >
        {connecting || startingMedia ? (
          <>
            <LoadingSpinner />
            {connecting ? 'Connecting...' : 'Starting camera...'}
          </>
        ) : (
          'Find match'
        )}
      </Button>
    </>
  );
});
