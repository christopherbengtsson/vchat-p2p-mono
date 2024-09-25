import clsx from 'clsx';
import { MainStore } from './stores/MainStore';
import { MainStoreProvider } from './stores/MainStoreProvider';
import { Routes } from './routes/Routes';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const DYNAMIC_DARK_MODE = window.matchMedia(
  '(prefers-color-scheme:dark)',
).matches;

const store = new MainStore();

export function Application() {
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
        </main>
      </MainStoreProvider>
    </ErrorBoundary>
  );
}
