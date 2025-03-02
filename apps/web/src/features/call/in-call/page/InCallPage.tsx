import { useEffect } from 'react';
import { observer } from 'mobx-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Maybe } from '@mono/common-dto';
import { CallStoreProvider } from '@/features/call/context/CallStoreProvider';
import type { CallRouterStateProps } from '../model/CallRouterStateProps';
import { CallContainer } from '../container/CallContainer';

interface CallRouterStateLocation {
  state: Maybe<CallRouterStateProps>;
}

export const InCallPage = observer(function InCallPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation() as CallRouterStateLocation;
  const validState = roomId && state;

  useEffect(() => {
    if (!validState) {
      navigate(-1);
    }
  }, [navigate, validState]);

  if (!validState) {
    return null;
  }

  return (
    <CallStoreProvider callState={{ ...state, roomId }}>
      <CallContainer routerState={{ ...state, roomId }} />
    </CallStoreProvider>
  );
});
