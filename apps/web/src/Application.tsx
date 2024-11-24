import { useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { ErrorBoundary } from '@/common/components/error-boundary/ErrorBoundary';
import { Routes } from './Routes';
import { RootStore } from './stores/RootStore';
import { RootStoreProvider } from './stores/context/RootStoreProvider';

const queryClient = new QueryClient();

export function Application() {
  const storeRef = useRef(new RootStore());
  const store = storeRef.current;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RootStoreProvider store={store}>
          <Routes />
          <Toaster richColors />
        </RootStoreProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
