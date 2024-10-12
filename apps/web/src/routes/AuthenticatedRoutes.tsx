import { useEffect } from 'react';
import { observer } from 'mobx-react';
import { Navigate, Outlet } from 'react-router-dom';
import { useRootStore } from '../stores/RootStoreContext';

export const AuthenticatedRoutes = observer(function AuthenticatedRoutes() {
  const { authStore, socketStore } = useRootStore();

  useEffect(() => {
    if (authStore.session && !socketStore.connected) {
      socketStore.connect();
    }

    return () => socketStore.disconnect();
  }, [authStore.session, socketStore]);

  if (!authStore.session) {
    return <Navigate replace to="/auth" />;
  }

  return <Outlet />;
});
