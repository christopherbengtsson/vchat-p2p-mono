import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { observer } from 'mobx-react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRootStore } from '../stores/RootStoreContext';

export const StartPage = observer(function StartPage() {
  const { mainStore, socketStore } = useRootStore();

  const connectOrFindMatch = useCallback(async () => {
    mainStore.findMatch();
  }, [mainStore]);

  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-4">
      <Button
        asChild={socketStore.connected ? true : undefined}
        className="w-full"
        onClick={connectOrFindMatch}
        disabled={mainStore.errorState !== undefined || !socketStore.connected}
      >
        {!socketStore.connected ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting...
          </>
        ) : (
          <Link to="/call">Find match</Link>
        )}
      </Button>

      {socketStore.connected && (
        <p className="text-primary-foreground">
          Currently {mainStore.nrOfAvailableUsers} more users online
        </p>
      )}
    </div>
  );
});
