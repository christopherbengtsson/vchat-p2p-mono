import { useEffect } from 'react';
import { observer } from 'mobx-react';
import { Navigate, Outlet } from 'react-router-dom';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { RoutePath } from '@/RoutePath';

export const AuthenticatedRoutesContainer = observer(
  function AuthenticatedRoutesContainer() {
    const { authStore, socketStore } = useRootStore();

    useEffect(() => {
      if (authStore.authenticated && !socketStore.connected) {
        socketStore.connect();
      }

      return () => socketStore.disconnect();
    }, [authStore.authenticated, socketStore]);

    if (!authStore.session && !authStore.banned) {
      return <Navigate replace to={RoutePath.AUTH} />;
    }

    if (!authStore.session && authStore.banned) {
      return <Navigate replace to={RoutePath.BANNED} />;
    }

    return <Outlet />;
  },
);
