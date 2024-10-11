import { useState } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorToast } from '@/components/ErrorToast';
import { Routes } from './routes/Routes';
import { RootStore } from './stores/RootStore';
import { RootStoreProvider } from './stores/RootStoreProvider';

export function Application() {
  const [store] = useState(new RootStore());

  return (
    <ErrorBoundary>
      <RootStoreProvider store={store}>
        <Routes />
        <ErrorToast />
      </RootStoreProvider>
    </ErrorBoundary>
  );
}
