import { useState } from 'react';
import clsx from 'clsx';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorToast } from '@/components/ErrorToast';
import { Routes } from './routes/Routes';
import { MainStore } from './stores/MainStore';
import { MainStoreProvider } from './stores/MainStoreProvider';

const DYNAMIC_DARK_MODE = window.matchMedia(
  '(prefers-color-scheme:dark)',
).matches;

export function Application() {
  const [store] = useState(new MainStore());

  return (
    <ErrorBoundary>
      <MainStoreProvider store={store}>
        <main
          className={clsx(
            'themes-wrapper bg-background w-full h-screen flex items-center justify-center px-4',
            {
              dark: DYNAMIC_DARK_MODE,
            },
          )}
        >
          <Routes />
          <ErrorToast />
        </main>
      </MainStoreProvider>
    </ErrorBoundary>
  );
}
