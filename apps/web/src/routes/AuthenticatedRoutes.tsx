import { useEffect } from 'react';
import { observer } from 'mobx-react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { useMainStore } from '../stores/MainStoreContext';
import { StartPage } from '../pages/StartPage';
import { MainVideoPage } from '../pages/MainVideoPage';
import { CallPage } from '../pages/CallPage';

export const AuthenticatedRoutes = observer(function AuthenticatedRoutes() {
  const mainstore = useMainStore();

  useEffect(() => {
    mainstore.connect();

    return () => {
      console.log('Disconnecting...');
      mainstore.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const router = createBrowserRouter([
    {
      path: '/',
      element: <MainVideoPage />,
      errorElement: <div>Root error</div>,
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
  ]);

  return <RouterProvider router={router} />;
});
