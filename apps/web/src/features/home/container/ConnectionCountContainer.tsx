import { useEffect, useState } from 'react';
import { observer } from 'mobx-react';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { CurrentUsersOnline } from '../component/CurrentUsersOnline';

export const ConnectionCountContainer = observer(
  function ConnectionsCounterContainer() {
    const { socketStore } = useRootStore();

    const [nrOfAvailableUsers, setNrOfAvailableUsers] = useState(0);

    useEffect(() => {
      socketStore.socket?.on('connections-count', (count: number) => {
        setNrOfAvailableUsers(count === 1 ? 0 : count - 1);
      });

      return () => {
        socketStore.socket?.off('connections-count');
      };
    }, [socketStore.socket]);

    return (
      socketStore.connected && (
        <CurrentUsersOnline nrOfAvailableUsers={nrOfAvailableUsers} />
      )
    );
  },
);
