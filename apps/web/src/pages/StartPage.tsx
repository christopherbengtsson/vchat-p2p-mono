import { useCallback } from 'react';
import { observer } from 'mobx-react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMainStore } from '../stores/MainStoreContext';

export const StartPage = observer(function StartPage() {
  const mainStore = useMainStore();

  const connectOrFindMatch = useCallback(async () => {
    mainStore.findMatch();
  }, [mainStore]);

  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-4">
      <Button
        className="w-full"
        onClick={connectOrFindMatch}
        disabled={
          mainStore.errorState !== undefined || !mainStore.isSocketConnected
        }
      >
        {!mainStore.isSocketConnected && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {!mainStore.isSocketConnected ? 'Connecting...' : 'Find match'}
      </Button>

      {mainStore.isSocketConnected && (
        <p className="text-primary-foreground">
          Currently {mainStore.nrOfAvailableUsers} more users online
        </p>
      )}
    </div>
  );
});
