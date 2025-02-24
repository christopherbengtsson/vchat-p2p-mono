import { useEffect } from 'react';
import { observer } from 'mobx-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Maybe } from '@mono/common-dto';
import { CallStoreProvider } from '@/features/call/context/CallStoreProvider';
import { CallContainer } from '../container/CallContainer';

export interface CallState {
  partnerSocketId: string;
  partnerUserId: string;
  isPolite: boolean;
}

interface CallStateLocation {
  state: Maybe<CallState>;
}

export const InCallPage = observer(function InCallPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation() as CallStateLocation;
  const validState = roomId && state;

  // TOOD: Breakout webrtc as a separate service

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
      <CallContainer state={{ ...state, roomId }} />
    </CallStoreProvider>
  );
});
