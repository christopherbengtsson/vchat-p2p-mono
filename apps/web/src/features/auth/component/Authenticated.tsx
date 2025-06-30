import { Outlet } from 'react-router';
import { observer } from 'mobx-react';
import { useEffect } from 'react';
import { autorun } from 'mobx';
import { useLoadNSFWModel } from '../../call/in-call/content-moderation/hooks/useLoadNSFWModel';

interface Props {
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
}

export const Authenticated = observer(function Authenticated({
  connected,
  connect,
  disconnect,
}: Props) {
  useLoadNSFWModel();

  useEffect(() => {
    const dispose = autorun(() => {
      if (!connected) {
        connect();
      }
    });

    return () => {
      disconnect();
      dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Outlet />;
});
