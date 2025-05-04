import { lazy, useState } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { withFaroRouterInstrumentation } from '@grafana/faro-react';
import { LayoutContainer } from './common/layout/container/LayoutContainer';
import { AuthenticatedRoutesContainer } from './features/auth/container/AuthenticatedRoutesContainer';
import { DevRoutePath, RoutePath } from './RoutePath';
import { TermsOfServicePage } from './features/consent/page/TermsOfServicePage';
import { AuthPage } from './features/auth/page/AuthPage';
import { UserBannedPage } from './features/user-report/page/UserBannedPage';
import { HomePage } from './features/home/page/HomePage';
import { QueuePage } from './features/call/page/QueuePage';
import { InCallPage } from './features/call/in-call/page/InCallPage';
import { ErrorBoundary } from './common/components/error-boundary/ErrorBoundary';

const DevMenu = lazy(() =>
  import('./features/dev/DevMenu').then(({ DevMenu }) => ({
    default: DevMenu,
  })),
);
const FlappyTrumpDev = lazy(() =>
  import('./features/dev/game/FlappyTrumpDev').then(({ FlappyTrumpDev }) => ({
    default: FlappyTrumpDev,
  })),
);
const ResultsDialogDev = lazy(() =>
  import('./features/dev/game/ResultDialogsDev').then(
    ({ ResultsDialogDev }) => ({
      default: ResultsDialogDev,
    }),
  ),
);

const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: DevRoutePath.DEV,
        element: <DevMenu />,
        children: [
          {
            path: DevRoutePath.FLAPPY_TRUMP,
            element: <FlappyTrumpDev />,
          },
          {
            path: DevRoutePath.RESULTS_DIALOG,
            element: <ResultsDialogDev />,
          },
        ],
      },
    ]
  : [];

const router = createBrowserRouter([
  {
    path: RoutePath.TERMS,
    element: <TermsOfServicePage />,
  },
  {
    element: <LayoutContainer />,
    errorElement: <ErrorBoundary />,
    children: [
      ...devRoutes,
      {
        path: RoutePath.AUTH,
        element: <AuthPage />,
      },
      {
        path: RoutePath.BANNED,
        element: <UserBannedPage />,
      },
      {
        element: <AuthenticatedRoutesContainer />,
        children: [
          {
            index: true,
            element: <HomePage />,
          },
          {
            path: RoutePath.CALL,
            element: <QueuePage />,
          },
          {
            path: RoutePath.IN_CALL,
            element: <InCallPage />,
          },
        ],
      },
    ],
  },
]);

const createRouter = () => withFaroRouterInstrumentation(router);

export function Routes() {
  const [router] = useState(() => createRouter());

  return <RouterProvider router={router} />;
}
