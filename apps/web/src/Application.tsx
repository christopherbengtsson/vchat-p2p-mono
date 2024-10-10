import { useState } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorToast } from '@/components/ErrorToast';
import { Routes } from './routes/Routes';
import { MainStore } from './stores/MainStore';
import { MainStoreProvider } from './stores/MainStoreProvider';

export function Application() {
  const [store] = useState(new MainStore());

  return (
    <ErrorBoundary>
      <MainStoreProvider store={store}>
        <Routes />
        <ErrorToast />
      </MainStoreProvider>
    </ErrorBoundary>
  );
}
