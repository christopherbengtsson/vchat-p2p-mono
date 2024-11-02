import { useEffect, useState } from 'react';
import { observer } from 'mobx-react';
import { Check, CircleX } from 'lucide-react';
import { Toaster } from '@/common/components/ui/toaster';
import { useToast } from '@/common/hooks/use-toast';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { ErrorState } from '@/stores/model/ErrorState';

const getToastData = (errorState: ErrorState, restore?: boolean) => {
  if (errorState === ErrorState.CONNECT_ERROR) {
    return {
      title: restore ? 'Connection restored' : 'Connection error',
      description: restore ? '' : 'Cannot connect to server',
    };
  }

  if (errorState === ErrorState.SERVER_DISCONNECTED) {
    return {
      title: 'Disconnected',
      description: 'You have been kicked out by an admin',
    };
  }

  return {
    title: 'Unknown error',
  };
};

export const ErrorToast = observer(function ErrorToast() {
  const { uiStore } = useRootStore();
  const { toast } = useToast();

  const [toastShown, setToastShown] = useState(false);
  const [previousError, setPreviousError] = useState<ErrorState>();

  useEffect((): void => {
    if (uiStore.errorState) {
      setToastShown(true);
      setPreviousError(uiStore.errorState);
      toast({
        ...getToastData(uiStore.errorState),
        variant: 'destructive',
        action: <CircleX />,
      });
    } else if (previousError === ErrorState.CONNECT_ERROR && toastShown) {
      setToastShown(false);
      const toastData = getToastData(previousError, true);
      toast({
        ...toastData,
        action: <Check />,
      });
    } else {
      setPreviousError(undefined);
    }
  }, [uiStore.errorState, previousError, toast, toastShown]);

  return <Toaster />;
});
