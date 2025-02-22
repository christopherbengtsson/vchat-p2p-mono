import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { withFaroRouterInstrumentation } from '@grafana/faro-react';
import { LayoutContainer } from './common/layout/container/LayoutContainer';
import { AuthenticatedRoutesContainer } from './features/auth/container/AuthenticatedRoutesContainer';
import { RoutePath } from './RoutePath';
import { TermsOfServicePage } from './features/consent/page/TermsOfServicePage';
import { AuthPage } from './features/auth/page/AuthPage';
import { UserBannedPage } from './features/user-report/page/UserBannedPage';
import { HomePage } from './features/home/page/HomePage';
import { RandomCallPage } from './features/call/page/RandomCallPage';

export function Routes() {
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
                element: <RandomCallPage />,
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

  const routerWithAnalytics = withFaroRouterInstrumentation(router);

  return (
    <RouterProvider
      router={routerWithAnalytics}
      future={{
        v7_startTransition: true,
      }}
    />
  );
}
