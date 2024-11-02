import { Navigate } from 'react-router-dom';
import { observer } from 'mobx-react';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { AuthFormContainer } from '../container/AuthContainer';

export const AuthPage = observer(function AuthPage() {
  const { authStore } = useRootStore();

  if (authStore.session) {
    return <Navigate replace to="/" />;
  }

  return <AuthFormContainer />;
});
