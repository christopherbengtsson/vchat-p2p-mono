import { Outlet } from 'react-router-dom';

export function LayoutContainer() {
  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <main className="relative w-full h-screen flex items-center justify-center">
        <Outlet />
      </main>
    </div>
  );
}
