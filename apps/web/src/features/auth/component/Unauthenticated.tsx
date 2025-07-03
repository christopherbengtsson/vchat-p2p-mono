import { Navigate } from 'react-router';
import { observer } from 'mobx-react';
import { RouteParamKey, RouteParamValue, RoutePath } from '@/RoutePath';

interface Props {
  temporarilyBanned: boolean;
  permanentlyBanned: boolean;
}

export const Unauthenticated = observer(function Unauthenticated({
  temporarilyBanned,
  permanentlyBanned,
}: Props) {
  if (!temporarilyBanned && !permanentlyBanned) {
    return <Navigate replace to={RoutePath.AUTH} />;
  }

  return (
    <Navigate
      replace
      to={{
        pathname: RoutePath.BANNED,
        search: `?${RouteParamKey.BAN_TYPE}=${
          temporarilyBanned
            ? RouteParamValue.BAN_TYPE_TEMPORARY
            : RouteParamValue.BAN_TYPE_PERMANENT
        }`,
      }}
    />
  );
});
