import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { observer } from 'mobx-react';
import { AuthPage } from '../pages/AuthPage';
import { Layout } from '../pages/LayoutPage';
import { StartPage } from '../pages/StartPage';
import { CallPage } from '../pages/CallPage';
import { AuthenticatedRoutes } from './AuthenticatedRoutes';

export const Routes = observer(function Routes() {
  const router = createBrowserRouter([
    {
      element: <Layout />,
      errorElement: <div>Root error</div>,
      children: [
        {
          path: 'auth',
          element: <AuthPage />,
        },
        {
          element: <AuthenticatedRoutes />,
          children: [
            {
              index: true,
              element: <StartPage />,
            },
            {
              path: 'call',
              element: <CallPage />,
            },
          ],
        },
      ],
    },
  ]);

  return <RouterProvider router={router} />;
});
