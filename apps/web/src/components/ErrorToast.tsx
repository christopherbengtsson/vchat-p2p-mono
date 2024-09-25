import { useEffect, useState } from 'react';
import { observer } from 'mobx-react';
import { Check, CircleX } from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { useMainStore } from '../stores/MainStoreContext';
import { ErrorState } from '../stores/model/ErrorState';

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
  const mainStore = useMainStore();
  const { toast } = useToast();

  const [toastShown, setToastShown] = useState(false);
  const [previousError, setPreviousError] = useState<ErrorState>();

  useEffect((): void => {
    if (mainStore.errorState) {
      setToastShown(true);
      setPreviousError(mainStore.errorState);
      toast({
        ...getToastData(mainStore.errorState),
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
  }, [mainStore.errorState, previousError, toast, toastShown]);

  return <Toaster />;
});
