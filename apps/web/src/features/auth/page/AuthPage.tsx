import { Navigate } from 'react-router';
import { observer } from 'mobx-react';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { AuthFormContainer } from '../container/AuthFormContainer';

export const AuthPage = observer(function AuthPage() {
  const { authStore } = useRootStore();

  if (authStore.authenticated) {
    return <Navigate replace to="/" />;
  }

  return <AuthFormContainer />;
});
