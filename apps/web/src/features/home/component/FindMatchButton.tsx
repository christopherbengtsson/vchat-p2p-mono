import { useMemo } from 'react';
import { observer } from 'mobx-react';
import { Button } from '@/common/components/ui/button';
import { LoadingSpinner } from '@/common/components/loading-spinner/LoadingSpinner';
import { FindMatchLoadingState } from '../model/FindMatchLoadingState';

interface Props {
  onClick: VoidFunction;
  connecting: boolean;
  startingMedia: boolean;
  loadingState: FindMatchLoadingState;
}

export const FindMatchButton = observer(function FindMatchButton({
  onClick,
  connecting,
  startingMedia,
  loadingState,
}: Props) {
  const buttonText = useMemo(() => {
    if (connecting) {
      return 'Connecting...';
    } else if (loadingState === 'contentModeration') {
      return 'Loading safety features...';
    } else if (loadingState === 'mediaCheck' || startingMedia) {
      return 'Starting media...';
    }
    return 'Find match';
  }, [connecting, loadingState, startingMedia]);

  const isLoading = connecting || startingMedia || loadingState !== 'idle';

  return (
    <>
      <Button className="w-full" onClick={onClick} disabled={isLoading}>
        {isLoading ? (
          <>
            <LoadingSpinner />
            {buttonText}
          </>
        ) : (
          buttonText
        )}
      </Button>
    </>
  );
});
