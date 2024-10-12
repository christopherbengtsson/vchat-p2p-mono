import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { observer } from 'mobx-react';
import { FastLoginButton } from '@/components/FastLoginButton';
import { useRootStore } from '../stores/RootStoreContext';

export const AuthPage = observer(function AuthPage() {
  const { authStore } = useRootStore();
  const [loading, setLoading] = useState(false);

  if (authStore.session) {
    return <Navigate replace to="/" />;
  }

  const loginAnonymously = async () => {
    setLoading(true);
    await authStore.loginAnonymously();
    setLoading(false);
  };

  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-4">
      <FastLoginButton loading={loading} onClick={loginAnonymously} />
    </div>
  );
});
