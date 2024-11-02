import { Navigate } from 'react-router-dom';
import { observer } from 'mobx-react';
import { useRootStore } from '@/stores/RootStoreContext';
import { AppState } from '@/stores/model/AppState';
import { QueuePage } from './QueuePage';
import { InCallPage } from './InCallPage';

export const RandomCallPage = observer(function CallPage() {
  const { uiStore } = useRootStore();

  switch (uiStore.appState) {
    case AppState.IN_QUEUE:
    case AppState.MATCH_FOUND:
      return <QueuePage />;

    case AppState.IN_CALL:
      return <InCallPage />;

    default:
      return <Navigate to="/" replace />;
  }
});
