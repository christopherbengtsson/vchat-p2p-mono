import { observer } from 'mobx-react';
import { AuthPage } from '../pages/AuthPage';
import { useRootStore } from '../stores/RootStoreContext';
import { AuthenticatedRoutes } from './AuthenticatedRoutes';

export const Routes = observer(function Routes() {
  const { authStore } = useRootStore();

  if (authStore.session) {
    return <AuthenticatedRoutes />;
  }

  return <AuthPage />;
});
