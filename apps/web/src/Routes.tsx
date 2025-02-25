import { useState } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { withFaroRouterInstrumentation } from '@grafana/faro-react';
import { LayoutContainer } from './common/layout/container/LayoutContainer';
import { AuthenticatedRoutesContainer } from './features/auth/container/AuthenticatedRoutesContainer';
import { RoutePath } from './RoutePath';
import { TermsOfServicePage } from './features/consent/page/TermsOfServicePage';
import { AuthPage } from './features/auth/page/AuthPage';
import { UserBannedPage } from './features/user-report/page/UserBannedPage';
import { HomePage } from './features/home/page/HomePage';
import { QueuePage } from './features/call/page/QueuePage';
import { InCallPage } from './features/call/in-call/page/InCallPage';

const router = createBrowserRouter(
  [
    {
      path: RoutePath.TERMS,
      element: <TermsOfServicePage />,
    },
    {
      element: <LayoutContainer />,
      errorElement: <div>Root error</div>,
      children: [
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
  ],
  {
    future: {
      v7_relativeSplatPath: true,
    },
  },
);

const createRouter = () => withFaroRouterInstrumentation(router);

export function Routes() {
  const [router] = useState(() => createRouter());

  return (
    <RouterProvider
      router={router}
      future={{
        v7_startTransition: true,
      }}
    />
  );
}
