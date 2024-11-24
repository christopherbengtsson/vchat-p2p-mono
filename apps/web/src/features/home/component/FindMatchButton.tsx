import { observer } from 'mobx-react';
import { Button } from '@/common/components/ui/button';
import { LoadingButton } from '@/common/components/loading-button/LoadingButton';

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
            <LoadingButton />
            {connecting ? 'Connecting...' : 'Starting camera...'}
          </>
        ) : (
          'Find match'
        )}
      </Button>
    </>
  );
});
