import { observer } from 'mobx-react';
import { AuthPage } from '../pages/AuthPage';
import { useMainStore } from '../stores/MainStoreContext';
import { AuthenticatedRoutes } from './AuthenticatedRoutes';

export const Routes = observer(function Routes() {
  const mainStore = useMainStore();

  if (mainStore.authStore.session) {
    return <AuthenticatedRoutes />;
  }

  return <AuthPage />;
});
