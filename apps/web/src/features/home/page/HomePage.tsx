import { useCallback } from 'react';
import { observer } from 'mobx-react';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { CurrentUsersOnline } from '../component/CurrentUsersOnline';
import { SettingsMenuContainer } from '../container/SettingsMenuContainer';
import { FindMatchButton } from '../component/FindMatchButton';

export const HomePage = observer(function StartPage() {
  const { uiStore, socketStore } = useRootStore();

  const connectOrFindMatch = useCallback(async () => {
    uiStore.findMatch();
  }, [uiStore]);

  return (
    <>
      <SettingsMenuContainer />

      <div className="w-full max-w-sm flex flex-col items-center gap-4">
        <FindMatchButton
          connectOrFindMatch={connectOrFindMatch}
          connected={socketStore.connected}
          disabled={uiStore.errorState !== undefined}
        />

        {socketStore.connected && (
          <CurrentUsersOnline nrOfAvailableUsers={uiStore.nrOfAvailableUsers} />
        )}
      </div>
    </>
  );
});
