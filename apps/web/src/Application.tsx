import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/common/components/ErrorBoundary';
import { ErrorToast } from '@/common/components/ErrorToast';
import { Routes } from './Routes';
import { RootStore } from './stores/RootStore';
import { RootStoreProvider } from './stores//context/RootStoreProvider';

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
