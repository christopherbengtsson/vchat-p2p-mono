import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorToast } from '@/components/ErrorToast';
import { Routes } from './routes/Routes';
import { RootStore } from './stores/RootStore';
import { RootStoreProvider } from './stores/RootStoreProvider';

const queryClient = new QueryClient();

export function Application() {
  const [store] = useState(new RootStore());

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RootStoreProvider store={store}>
          <Routes />
          <ErrorToast />
        </RootStoreProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
