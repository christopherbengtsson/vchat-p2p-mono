import { Navigate } from 'react-router';
import { observer } from 'mobx-react';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { useCursorTrack } from '@/common/hooks/useCursorTrack';
import { AuthFormContainer } from '../container/AuthFormContainer';

export const AuthPage = observer(function AuthPage() {
  const { authStore } = useRootStore();
  useCursorTrack();

  if (authStore.authenticated) {
    return <Navigate replace to="/" />;
  }

  return <AuthFormContainer />;
});
