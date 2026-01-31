import { useMemo } from 'react';
import { observer } from 'mobx-react';
import { Globe } from 'lucide-react';
import { Button } from '@/common/components/ui/button';
import { LoadingSpinner } from '@/common/components/loading-spinner/LoadingSpinner';
import { GlassElement } from '@/common/components/liquid-glass/GlassElement';
import { TypographyP } from '@/common/components/typography/Typography';
import { FindMatchLoadingState } from '../model/FindMatchLoadingState';
import { useSlowLoadingNotification } from '../hooks/useSlowLoadingNotification';

interface Props {
  onClick: VoidFunction;
  connecting: boolean;
  startingMedia: boolean;
  loadingState: FindMatchLoadingState;
  disabled?: boolean;
}

export const FindMatchButton = observer(function FindMatchButton({
  onClick,
  connecting,
  startingMedia,
  loadingState,
  disabled = false,
}: Props) {
  const showModerationMessage = useSlowLoadingNotification(loadingState);

  const { isLoading, buttonText } = useMemo(() => {
    if (connecting) {
      return { isLoading: true, buttonText: 'Connecting...' };
    } else if (loadingState === 'fetchingUser') {
      return { isLoading: true, buttonText: 'Loading user...' };
    } else if (loadingState === 'contentModeration') {
      return { isLoading: true, buttonText: 'Loading safety features...' };
    } else if (loadingState === 'mediaCheck' || startingMedia) {
      return { isLoading: true, buttonText: 'Starting media...' };
    }
    return { isLoading: false, buttonText: 'Find match' };
  }, [connecting, loadingState, startingMedia]);

  return (
    <div className="flex justify-center relative w-full max-w-[400px]">
      <GlassElement maxWidth={400} maxHeight={52} radius={12} ripple>
        <Button
          size="xl"
          className="bg-transparent border-0 w-full text-foreground hover:bg-transparent"
          onClick={onClick}
          disabled={isLoading || disabled}
        >
          {isLoading ? (
            <>
              <LoadingSpinner />
              {buttonText}
            </>
          ) : (
            <>
              <Globe className="mr-3" />
              {buttonText}
            </>
          )}
        </Button>
      </GlassElement>
      <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 w-full max-w-[400px]">
        <TypographyP
          className={`text-sm text-muted-foreground text-center px-4 transition-opacity duration-300 ${
            showModerationMessage ? 'opacity-100' : 'opacity-0'
          }`}
        >
          This may take a moment as we download our content moderation model.
          This only happens once to help keep the platform safe.
        </TypographyP>
      </div>
    </div>
  );
});
