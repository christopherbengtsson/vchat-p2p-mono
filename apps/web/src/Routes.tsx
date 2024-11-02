import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { withFaroRouterInstrumentation } from '@grafana/faro-react';
import { observer } from 'mobx-react';
import { LayoutContainer } from './common/layout/container/LayoutContainer';
import { AuthenticatedRoutesContainer } from './features/auth/container/AuthenticatedRoutesContainer';
import { AuthPage } from './features/auth/page/AuthPage';
import { HomePage } from './features/home/page/HomePage';
import { RandomCallPage } from './features/call/page/RandomCallPage';

export const Routes = observer(function Routes() {
  const router = createBrowserRouter([
    {
      element: <LayoutContainer />,
      errorElement: <div>Root error</div>,
      children: [
        {
          path: 'auth',
          element: <AuthPage />,
        },
        {
          element: <AuthenticatedRoutesContainer />,
          children: [
            {
              index: true,
              element: <HomePage />,
            },
            {
              path: 'call',
              element: <RandomCallPage />,
            },
          ],
        },
      ],
    },
  ]);

  const routerWithAnalytics = withFaroRouterInstrumentation(router);

  return <RouterProvider router={routerWithAnalytics} />;
});
