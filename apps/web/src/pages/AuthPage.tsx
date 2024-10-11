import { observer } from 'mobx-react';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { FastLoginButton } from '@/components/FastLoginButton';
import { useRootStore } from '../stores/RootStoreContext';

export const AuthPage = observer(function AuthPage() {
  const { authStore } = useRootStore();
  const [loading, setLoading] = useState(false);

  const loginAnonymously = async () => {
    setLoading(true);
    await authStore.loginAnonymously();
    setLoading(false);
  };

  return (
    <Card>
      <FastLoginButton loading={loading} onClick={loginAnonymously} />
    </Card>
  );
});
