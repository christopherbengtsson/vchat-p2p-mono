import { useCallback } from 'react';
import { observer } from 'mobx-react';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { FindMatchButton } from '../component/FindMatchButton';

export const FindMatchContainer = observer(function FindMatchContainer() {
  const { socketStore, callStore } = useRootStore();

  const connectOrFindMatch = useCallback(() => {
    callStore.findMatch();
  }, [callStore]);

  return (
    <FindMatchButton
      connectOrFindMatch={connectOrFindMatch}
      connected={socketStore.connected}
    />
  );
});
