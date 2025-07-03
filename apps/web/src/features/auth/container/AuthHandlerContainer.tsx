import { observer } from 'mobx-react';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { LoadingSpinner } from '@/common/components/loading-spinner/LoadingSpinner';
import { Unauthenticated } from '../component/Unauthenticated';
import { Authenticated } from '../component/Authenticated';

export const AuthHandlerContainer = observer(function AuthHandlerContainer() {
  const { authStore, socketStore } = useRootStore();

  if (authStore.isLoading) {
    return (
      <div className="absolute h-full w-full flex items-center justify-center">
        <LoadingSpinner className="h-16 w-16 text-primary" />
      </div>
    );
  }

  if (!authStore.session) {
    return (
      <Unauthenticated
        permanentlyBanned={authStore.permanentlyBanned}
        temporarilyBanned={authStore.temporarilyBanned}
      />
    );
  }

  return (
    <Authenticated
      connected={socketStore.connected}
      connect={socketStore.connect}
      disconnect={socketStore.disconnect}
    />
  );
});
