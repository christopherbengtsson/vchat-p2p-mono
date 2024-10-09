import { useEffect } from 'react';
import { observer } from 'mobx-react';
import { useMainStore } from '../stores/MainStoreContext';
import { AppState } from '../stores/model/AppState';
import { StartPage } from '../pages/StartPage';
import { QueuePage } from '../pages/QueuePage';
import { CallPage } from '../pages/CallPage';

export const AuthenticatedRoutes = observer(function AuthenticatedRoutes() {
  const mainstore = useMainStore();

  useEffect(() => {
    mainstore.connect();

    return () => {
      console.log('Disconnecting...');
      mainstore.disconnect();
      mainstore.webRtcStore.cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  switch (mainstore.appState) {
    case AppState.START:
      return <StartPage />;

    case AppState.IN_QUEUE:
    case AppState.MATCH_FOUND:
      return <QueuePage />;

    case AppState.IN_CALL:
      return <CallPage />;

    default:
      throw new Error(`Unknown app state: ${mainstore.appState}`);
  }
});
