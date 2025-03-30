import { useEffect } from 'react';
import { autorun } from 'mobx';
import { observer } from 'mobx-react';
import { Navigate, Outlet } from 'react-router';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { RoutePath, RouteParamValue } from '@/RoutePath';
import { LoadingSpinner } from '@/common/components/loading-spinner/LoadingSpinner';

export const AuthenticatedRoutesContainer = observer(
  function AuthenticatedRoutesContainer() {
    const { authStore, socketStore } = useRootStore();

    useEffect(() => {
      const dispose = autorun(() => {
        if (authStore.authenticated && !socketStore.connected) {
          socketStore.connect();
        }
      });

      return () => {
        socketStore.disconnect();
        dispose();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (authStore.isLoading) {
      return (
        <div className="absolute h-full w-full flex items-center justify-center">
          <LoadingSpinner className="h-16 w-16 text-primary" />
        </div>
      );
    }

    if (
      !authStore.session &&
      !authStore.temporarilyBanned &&
      !authStore.permanentlyBanned
    ) {
      return <Navigate replace to={RoutePath.AUTH} />;
    }

    if (
      !authStore.session &&
      (authStore.temporarilyBanned || authStore.permanentlyBanned)
    ) {
      return (
        <Navigate
          replace
          to={{
            pathname: RoutePath.BANNED,
            search: `?type=${
              authStore.temporarilyBanned
                ? RouteParamValue.BAN_TYPE_TEMPORARY
                : RouteParamValue.BAN_TYPE_PERMANENT
            }`,
          }}
        />
      );
    }

    return <Outlet />;
  },
);
