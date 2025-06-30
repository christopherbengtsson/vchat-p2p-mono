import { Outlet } from 'react-router';
import { Layout } from '../component/Layout';

export function LayoutContainer() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
