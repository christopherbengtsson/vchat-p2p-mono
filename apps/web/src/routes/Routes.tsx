import { observer } from 'mobx-react';
import { AuthenticatedRoutes } from './AuthenticatedRoutes';
import { AuthPage } from '../pages/AuthPage';
import { useMainStore } from '../stores/MainStoreContext';

export const Routes = observer(function Routes() {
  const mainStore = useMainStore();

  if (mainStore.authStore.session) {
    return <AuthenticatedRoutes />;
  }

  return <AuthPage />;
});
