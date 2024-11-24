import { Navigate } from 'react-router-dom';
import { observer } from 'mobx-react';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { CallState } from '@/stores/model/CallState';
import { QueueContainer } from '../container/QueueContainer';
import { InCallContainer } from '../container/InCallContainer';

export const RandomCallPage = observer(function CallPage() {
  const { callStore } = useRootStore();

  switch (callStore.callState) {
    case CallState.IN_QUEUE:
    case CallState.MATCH_FOUND:
      return <QueueContainer />;

    case CallState.IN_CALL:
      return <InCallContainer />;

    default:
      return <Navigate to="/" replace />;
  }
});
