import { useCallback } from 'react';
import { observer } from 'mobx-react';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { SettingsMenuContainer } from '../container/SettingsMenuContainer';
import { FindMatchButton } from '../component/FindMatchButton';
import { ConnectionCountContainer } from '../container/ConnectionCountContainer';

export const HomePage = observer(function StartPage() {
  const { socketStore, callStore } = useRootStore();

  const connectOrFindMatch = useCallback(async () => {
    callStore.findMatch();
  }, [callStore]);

  return (
    <>
      <SettingsMenuContainer />

      <div className="w-full max-w-sm flex flex-col items-center gap-4">
        <FindMatchButton
          connectOrFindMatch={connectOrFindMatch}
          connected={socketStore.connected}
        />

        <ConnectionCountContainer />
      </div>
    </>
  );
});
