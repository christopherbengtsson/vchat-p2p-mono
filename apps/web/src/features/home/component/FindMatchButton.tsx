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
  const { isLoading, buttonText } = useMemo(() => {
    if (connecting) {
      return { isLoading: true, buttonText: 'Connecting...' };
    } else if (loadingState === 'contentModeration') {
      return { isLoading: true, buttonText: 'Loading safety features...' };
    } else if (loadingState === 'mediaCheck' || startingMedia) {
      return { isLoading: true, buttonText: 'Starting media...' };
    }
    return { isLoading: false, buttonText: 'Find match' };
  }, [connecting, loadingState, startingMedia]);

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
