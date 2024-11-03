import { Navigate } from 'react-router-dom';
import { observer } from 'mobx-react';
import { useRootStore } from '@/stores/hooks/useRootStore';
import { AppState } from '@/stores/model/AppState';
import { QueueContainer } from '../container/QueueContainer';
import { InCallContainer } from '../container/InCallContainer';

export const RandomCallPage = observer(function CallPage() {
  const { uiStore } = useRootStore();

  switch (uiStore.appState) {
    case AppState.IN_QUEUE:
    case AppState.MATCH_FOUND:
      return <QueueContainer />;

    case AppState.IN_CALL:
      return <InCallContainer />;

    default:
      return <Navigate to="/" replace />;
  }
});
