import { Outlet } from 'react-router-dom';

export function LayoutContainer() {
  return (
    <div className="relative w-full h-dvh bg-background overflow-hidden">
      <main className="relative w-full h-dvh flex items-center justify-center">
        <Outlet />
      </main>
    </div>
  );
}
