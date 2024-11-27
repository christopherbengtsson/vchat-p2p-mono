import { useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FaroErrorBoundary } from '@grafana/faro-react';
import { Toaster } from 'sonner';
import { Routes } from './Routes';
import { RootStore } from './stores/RootStore';
import { RootStoreProvider } from './stores/context/RootStoreProvider';

const queryClient = new QueryClient();

export function Application() {
  const storeRef = useRef(new RootStore());
  const store = storeRef.current;

  return (
    <FaroErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RootStoreProvider store={store}>
          <Routes />
          <Toaster richColors />
        </RootStoreProvider>
      </QueryClientProvider>
    </FaroErrorBoundary>
  );
}
